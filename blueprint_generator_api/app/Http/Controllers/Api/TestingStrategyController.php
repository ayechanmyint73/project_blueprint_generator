<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\TestingStrategy;
use App\Models\AiUsage;
use App\Services\AIService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TestingStrategyController extends Controller
{
    private function normalizePriority(?string $value): string
    {
        $v = strtolower(trim((string) $value));
        return in_array($v, ['high', 'medium', 'low'], true) ? $v : 'medium';
    }

    public function index(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $project = Project::where('user_id', $user->id)->findOrFail($projectId);
        $items = $project->testingStrategies()
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);

        $project = Project::where('user_id', $user->id)->findOrFail($projectId);
        $data = $request->validate([
            'test_case' => 'required|string|max:500',
            'test_type' => 'required|string|max:100',
            'description' => 'nullable|string|max:2000',
            'priority' => 'nullable|string|in:high,medium,low',
            'is_checked' => 'nullable|boolean',
        ]);

        $nextOrder = ((int) TestingStrategy::where('project_id', $project->id)->max('sort_order')) + 1;
        $item = TestingStrategy::create([
            'project_id' => $project->id,
            'test_case' => $data['test_case'],
            'test_type' => $data['test_type'],
            'description' => $data['description'] ?? '',
            'priority' => $this->normalizePriority($data['priority'] ?? 'medium'),
            'is_checked' => (bool) ($data['is_checked'] ?? false),
            'sort_order' => $nextOrder,
        ]);

        return response()->json(['message' => 'Test case created successfully', 'data' => $item], 201);
    }

    public function update(Request $request, $projectId, $testCaseId)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);
        $project = Project::where('user_id', $user->id)->findOrFail($projectId);

        $item = TestingStrategy::where('project_id', $project->id)->findOrFail($testCaseId);
        $data = $request->validate([
            'test_case' => 'sometimes|required|string|max:500',
            'test_type' => 'sometimes|required|string|max:100',
            'description' => 'sometimes|nullable|string|max:2000',
            'priority' => 'sometimes|nullable|string|in:high,medium,low',
            'is_checked' => 'sometimes|boolean',
        ]);

        if (array_key_exists('priority', $data)) {
            $data['priority'] = $this->normalizePriority($data['priority']);
        }

        $item->update($data);
        return response()->json(['message' => 'Test case updated successfully', 'data' => $item->fresh()]);
    }

    public function destroy(Request $request, $projectId, $testCaseId)
    {
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated'], 401);
        $project = Project::where('user_id', $user->id)->findOrFail($projectId);

        $item = TestingStrategy::where('project_id', $project->id)->findOrFail($testCaseId);
        $item->delete();
        return response()->json(['message' => 'Test case deleted successfully']);
    }

    public function generate(Request $request, $projectId, AIService $ai)
    {
        $requestId = (string) (request()->header('X-Request-Id') ?: Str::uuid());
        $user = $request->user();
        if (!$user) return response()->json(['message' => 'Unauthenticated', 'request_id' => $requestId], 401);

        $userId = (int) $user->id;
        if (AiUsage::countForToday($userId) >= 10) {
            return response()->json(['message' => 'Daily AI limit reached', 'request_id' => $requestId], 403);
        }

        $project = Project::where('user_id', $userId)->findOrFail($projectId);

        $prompt = <<<PROMPT
You are a senior QA lead.

For the following project, generate a JSON array of test cases. Each item must be an object with keys: "test_case", "test_type", "description", "priority".

Project Name: {$project->project_name}
Project Description: {$project->description}
Target Users: {$project->target_users}

Requirements:
- Return ONLY valid JSON (an array of objects).
- Provide 10-20 practical test cases covering unit, integration, API, UI, security, and performance.
- Use priority values: high, medium, low.
- Keep descriptions concise and actionable.
PROMPT;

        $content = $ai->chat(
            [
                ['role' => 'system', 'content' => 'You produce concise, machine-readable QA outputs.'],
                ['role' => 'user', 'content' => $prompt],
            ],
            ['model' => 'gpt-4.1-nano', 'temperature' => 0.3, 'max_tokens' => 1200, 'timeout' => 30]
        );

        if (!is_string($content) || trim($content) === '') {
            return response()->json(['message' => $ai->getLastError() ?? 'Failed to generate test cases', 'request_id' => $requestId], 502);
        }

        // Attempt to extract JSON from content
        $json = null;
        $trimmed = trim($content);
        // If wrapped in markdown, strip triple backticks
        $trimmed = preg_replace('/^```json\s*/i', '', $trimmed);
        $trimmed = preg_replace('/```\s*$/', '', $trimmed);

        try {
            $json = json_decode($trimmed, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable $e) {
            // Try to find first JSON array in the text
            if (preg_match('/(\[[\s\S]*\])/m', $content, $m)) {
                try {
                    $json = json_decode($m[1], true, 512, JSON_THROW_ON_ERROR);
                } catch (\Throwable $e) {
                    $json = null;
                }
            }
        }

        if (!is_array($json)) {
            return response()->json(['message' => 'AI returned non-JSON output. Please try again.', 'raw' => $content, 'request_id' => $requestId], 502);
        }

        // Persist results
        $created = [];
        foreach ($json as $item) {
            if (!is_array($item)) continue;
            $nextOrder = ((int) TestingStrategy::where('project_id', $project->id)->max('sort_order')) + 1;
            $ts = TestingStrategy::create([
                'project_id' => $project->id,
                'test_case' => (string) ($item['test_case'] ?? ($item['title'] ?? 'Untitled')),
                'test_type' => (string) ($item['test_type'] ?? 'unit'),
                'description' => (string) ($item['description'] ?? ''),
                'priority' => $this->normalizePriority((string) ($item['priority'] ?? 'medium')),
                'is_checked' => false,
                'sort_order' => $nextOrder,
            ]);
            $created[] = $ts;
        }

        AiUsage::record($userId, AiUsage::TYPE_TESTING_STRATEGY);

        return response()->json(['message' => 'Test cases generated', 'data' => $created, 'request_id' => $requestId]);
    }
}
