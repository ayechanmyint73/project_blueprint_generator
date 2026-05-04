<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiUsage;
use App\Models\DevelopmentPlan;
use App\Models\DevelopmentPlanPhase;
use App\Models\DevelopmentPlanTask;
use App\Models\Project;
use App\Services\AIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class DevelopmentPlanController extends Controller
{
    private function normalizePhasedTasks($tasksJson): array
    {
        if (is_array($tasksJson) && array_key_exists('phases', $tasksJson) && is_array($tasksJson['phases'])) {
            return $tasksJson;
        }

        if (is_array($tasksJson)) {
            $flat = $tasksJson;
            $phases = [
                [
                    'id' => 'phase_1',
                    'title' => 'Phase 1',
                    'tasks' => array_values(array_map(function ($t) {
                        return [
                            'id' => $t['id'] ?? null,
                            'title' => $t['title'] ?? '',
                            'status' => $t['status'] ?? 'pending',
                            'estimated_time' => $t['estimated_time'] ?? null,
                            'priority' => $t['priority'] ?? null,
                        ];
                    }, $flat)),
                ],
            ];

            return ['phases' => $phases];
        }

        return ['phases' => []];
    }

    /**
     * Convert database structure to legacy JSON format for frontend compatibility
     */
    private function convertToLegacyFormat(DevelopmentPlan $plan): array
    {
        $phases = $plan->phases->map(function (DevelopmentPlanPhase $phase) {
            return [
                'id' => (string) $phase->id,
                'title' => $phase->title,
                'tasks' => $phase->tasks->map(function (DevelopmentPlanTask $task) {
                    return [
                        'id' => (string) $task->id,
                        'title' => $task->title,
                        'status' => $task->status,
                        'estimated_time' => null,
                        'priority' => $task->priority,
                    ];
                })->all(),
            ];
        })->all();

        return [
            'id' => $plan->id,
            'project_id' => $plan->project_id,
            'source_type' => $plan->source_type,
            'status' => $plan->status,
            'progress_percent' => $plan->progress_percent,
            'tasks_json' => [
                'phases' => $phases,
            ],
            'created_at' => $plan->created_at,
            'updated_at' => $plan->updated_at,
        ];
    }

    /**
     * Import legacy JSON format into proper database tables
     */
    private function importFromLegacyFormat(DevelopmentPlan $plan, array $tasksJson): void
    {
        $normalized = $this->normalizePhasedTasks($tasksJson);

        // Delete existing phases and tasks
        $plan->phases()->delete();

        foreach ($normalized['phases'] as $sortOrder => $phaseData) {
            $phase = $plan->phases()->create([
                'title' => $phaseData['title'] ?? 'Phase ' . ($sortOrder + 1),
                'sort_order' => $sortOrder,
            ]);

            foreach ($phaseData['tasks'] ?? [] as $taskSortOrder => $taskData) {
                $phase->tasks()->create([
                    'title' => $taskData['title'] ?? '',
                    'status' => $taskData['status'] ?? 'pending',
                    'priority' => $taskData['priority'] ?? 'medium',
                    'sort_order' => $taskSortOrder,
                ]);
            }
        }

        $plan->recalculateProgress();
    }

    public function generate(Request $request, $projectId, AIService $ai)
    {
        $requestId = (string) (request()->header('X-Request-Id') ?: Str::uuid());
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated',
                'request_id' => $requestId,
            ], 401);
        }
        $userId = (int) $user->id;

        if (AiUsage::countForToday($userId) >= 5) {
            return response()->json([
                'message' => 'Daily AI limit reached',
                'request_id' => $requestId,
            ], 403);
        }

        $project = Project::where('user_id', $userId)->findOrFail($projectId);

        $prompt = $this->buildPrompt($project);

        Log::info('Development plan generate started', [
            'request_id' => $requestId,
            'user_id' => $userId,
            'project_id' => $projectId,
        ]);

        $content = $ai->generate($prompt);
        if (!is_string($content) || trim($content) === '') {
            $status = $ai->getLastHttpStatus();
            $err = $ai->getLastError() ?? 'AI generation failed';

            Log::warning('Development plan generate failed', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'project_id' => $projectId,
                'provider_status' => $status,
                'error' => $err,
            ]);

            return response()->json([
                'message' => $err,
                'provider_status' => $status,
                'request_id' => $requestId,
            ], $status === null ? 500 : 502);
        }

        AiUsage::record($userId, AiUsage::TYPE_ROADMAP);

        $tasks = $this->parsePhasedTasks($content);

        $plan = DevelopmentPlan::updateOrCreate(
            ['project_id' => $projectId],
            [
                'source_type' => 'ai',
                'status' => 'ready',
                'generated_at' => now(),
            ]
        );

        // Import into proper tables
        $this->importFromLegacyFormat($plan, $tasks);

        return response()->json([
            'message' => 'Development plan generated successfully',
            'data' => $this->convertToLegacyFormat($plan),
            'request_id' => $requestId,
        ]);
    }

    public function show(Request $request, $projectId)
    {
        $project = Project::where('user_id', $request->user()->id)
            ->findOrFail($projectId);

        $plan = DevelopmentPlan::with('phases.tasks')
            ->where('project_id', $projectId)
            ->first();

        if (!$plan) {
            return null;
        }

        // If we have legacy data but no proper tables, migrate it automatically
        if ($plan->phases()->count() === 0 && $plan->tasks_json !== null) {
            $this->importFromLegacyFormat($plan, $plan->tasks_json);
            $plan->load('phases.tasks');
        }

        return $this->convertToLegacyFormat($plan);
    }

    public function upsert(Request $request, $projectId)
    {
        $project = Project::where('user_id', $request->user()->id)->findOrFail($projectId);

        $data = $request->validate([
            'source_type' => 'sometimes|in:manual,ai',
            'content' => 'nullable|string',
            'tasks_json' => 'nullable|array',
        ]);

        $plan = DevelopmentPlan::updateOrCreate(
            ['project_id' => $project->id],
            [
                'source_type' => $data['source_type'] ?? 'manual',
                'status' => 'ready',
            ]
        );

        if (isset($data['tasks_json'])) {
            $this->importFromLegacyFormat($plan, $data['tasks_json']);
        }

        $plan->load('phases.tasks');

        return response()->json([
            'message' => 'Development plan saved successfully',
            'data' => $this->convertToLegacyFormat($plan),
        ]);
    }

    public function updateTask(Request $request, $projectId)
    {
        $taskId = $request->input('task_id');
        $status = $request->input('status');
        $userId = (int) $request->user()->id;

        $task = DevelopmentPlanTask::whereHas('phase.developmentPlan', function($query) use ($projectId, $userId) {
            $query->where('project_id', $projectId)
                ->whereHas('project', function($q) use ($userId) {
                    $q->where('user_id', $userId);
                });
        })
        ->findOrFail($taskId);

        $task->update([
            'status' => $status,
            'completed_at' => $status === 'completed' ? now() : null,
        ]);

        $task->phase->developmentPlan->recalculateProgress();

        $plan = $task->phase->developmentPlan->load('phases.tasks');

        return response()->json([
            'message' => 'Task updated successfully',
            'data' => $this->convertToLegacyFormat($plan),
        ]);
    }

    private function buildPrompt($project)
    {
        return "
        You are an expert software development project planner. Create a detailed development roadmap for the following project:

        Project Name: {$project->project_name}
        Project Description: {$project->description}
        Target Users: {$project->target_users}

        Instructions:

        1. Divide the roadmap into 4 clear phases:
        - Phase 1: Setup & Planning
        - Phase 2: Core Development
        - Phase 3: AI / Advanced Features (if applicable)
        - Phase 4: Testing & Deployment
        - Phase 5: Future Enhancements & Maintenance

        2. Under each phase, provide 5 practical development tasks.

        3. Tasks must be realistic for each of the project.

        4. Keep tasks concise and action-oriented.
    ";
    }

    public function progress($projectId)
    {
        $plan = DevelopmentPlan::where('project_id', $projectId)->firstOrFail();

        $phases = $plan->phases->map(function (DevelopmentPlanPhase $phase) {
            $total = $phase->tasks()->count();
            $done = $phase->tasks()->completed()->count();

            return [
                'id' => (string) $phase->id,
                'title' => $phase->title,
                'completed' => $done,
                'total' => $total,
                'progress' => $total > 0 ? round(($done / $total) * 100) : 0,
            ];
        });

        return [
            'progress' => $plan->progress_percent,
            'completed' => $plan->completed_tasks,
            'total' => $plan->total_tasks,
            'phases' => $phases,
        ];
    }

    private function parsePhasedTasks(string $content): array
    {
        $lines = preg_split("/\r\n|\r|\n/", $content);

        $phases = [];
        $current = null;
        $phaseIndex = 1;

        $flush = function () use (&$phases, &$current) {
            if (!$current) return;
            if (!isset($current['tasks'])) $current['tasks'] = [];
            $phases[] = $current;
        };

        $makePhase = function (string $title) use (&$phaseIndex) {
            $id = 'phase_' . $phaseIndex++;
            return ['id' => $id, 'title' => $title, 'tasks' => []];
        };

        $nextTaskId = 1;

        foreach ($lines as $line) {
            $t = trim((string) $line);
            if ($t === '') continue;

            if (preg_match('/^phase\s+\d+\s*[:\-–]\s*(.+)$/i', $t, $m)) {
                $flush();
                $title = trim($m[1]);
                $current = $makePhase($title);
                continue;
            }

            if (preg_match('/^#{1,3}\s+(.+)$/', $t, $m)) {
                $flush();
                $current = $makePhase(trim($m[1]));
                continue;
            }

            $clean = preg_replace('/^[-*•]\s+/', '', $t);
            $clean = preg_replace('/^\d+[.)]\s+/', '', $clean);
            $clean = trim((string) $clean);
            if ($clean === '') continue;

            if (!$current) {
                $current = $makePhase('Phase 1');
            }

            $estimated = null;
            $priority = null;

            if (preg_match('/\(([^)]+)\)\s*$/', $clean, $mm)) {
                $meta = $mm[1];
                $clean = trim((string) preg_replace('/\(([^)]+)\)\s*$/', '', $clean));
                $parts = array_map('trim', explode(',', $meta));
                if (isset($parts[0]) && $parts[0] !== '') $estimated = $parts[0];
                if (isset($parts[1]) && $parts[1] !== '') $priority = $parts[1];
            }

            $current['tasks'][] = [
                'id' => 't_' . $nextTaskId++,
                'title' => $clean,
                'status' => 'pending',
                'estimated_time' => $estimated,
                'priority' => $priority,
            ];
        }

        $flush();

        return ['phases' => $phases];
    }
}
