<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Blueprint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class BlueprintController extends Controller
{
    public function generate($projectId)
    {
        $requestId = (string) (request()->header('X-Request-Id') ?: Str::uuid());
        $start = microtime(true);
        $userId = auth()->id();

        $project = Project::where('user_id', $userId)->findOrFail($projectId);

        $prompt = $this->buildPrompt($project);

        $apiKey = (string) config('services.openrouter.api_key');
        $url = (string) config('services.openrouter.url');
        $model = (string) config('services.openrouter.model');

        if ($apiKey === '' || $url === '' || $model === '') {
            Log::error('Blueprint generate misconfigured', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'project_id' => $project->id,
                'has_api_key' => $apiKey !== '',
                'has_url' => $url !== '',
                'has_model' => $model !== '',
            ]);

            return response()->json([
                'message' => 'AI provider is not configured (missing OPENROUTER_API_KEY / OPENROUTER_URL / AI_MODEL)',
                'request_id' => $requestId,
            ], 500);
        }

        Log::info('Blueprint generate started', [
            'request_id' => $requestId,
            'user_id' => $userId,
            'project_id' => $project->id,
            'model' => $model,
            'prompt_chars' => strlen($prompt),
        ]);

        try {
            $response = Http::timeout(90)
                ->retry(1, 250)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $apiKey,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    // OpenRouter recommended metadata headers (safe defaults)
                    'HTTP-Referer' => (string) config('app.url'),
                    'X-Title' => (string) config('app.name'),
                ])
                ->post($url, [
                    'model' => $model,
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => $prompt,
                        ],
                    ],
                ]);
        } catch (Throwable $e) {
            Log::error('Blueprint generate provider call threw', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'project_id' => $project->id,
                'model' => $model,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to generate blueprint (provider request error)',
                'request_id' => $requestId,
            ], 500);
        }

        if($response->failed()) {
            $providerJson = null;
            try {
                $providerJson = $response->json();
            } catch (Throwable) {
                $providerJson = null;
            }

            Log::warning('Blueprint generate provider returned error', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'project_id' => $project->id,
                'model' => $model,
                'provider_status' => $response->status(),
                'provider_body' => Str::limit((string) $response->body(), 4000),
            ]);

            return response()->json([
                'message' => 'Failed to generate blueprint (provider error: '.$response->status().')',
                'provider_status' => $response->status(),
                'error' => $providerJson['error'] ?? $providerJson ?? Str::limit((string) $response->body(), 2000),
                'request_id' => $requestId,
            ], 500);
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        if (!is_string($content) || trim($content) === '') {
            Log::error('Blueprint generate provider response missing content', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'project_id' => $project->id,
                'model' => $model,
                'provider_status' => $response->status(),
                'provider_body' => Str::limit((string) $response->body(), 4000),
            ]);

            return response()->json([
                'message' => 'Failed to generate blueprint (unexpected provider response)',
                'provider_status' => $response->status(),
                'request_id' => $requestId,
            ], 500);
        }

        $blueprint = Blueprint::updateOrCreate(
            ['project_id' => $project->id],
            [
                'content' => $content,
                'model' => $model
            ]
        );

        $project->update([
            'status' => 'generated'
        ]);

        Log::info('Blueprint generate completed', [
            'request_id' => $requestId,
            'user_id' => $userId,
            'project_id' => $project->id,
            'model' => $model,
            'duration_ms' => (int) round((microtime(true) - $start) * 1000),
            'content_chars' => strlen($content),
        ]);

        return response()->json([
            'message' => 'Blueprint generated successfully',
            'data' => $blueprint,
            'request_id' => $requestId,
        ]);
    }

    public function buildPrompt(Project $project): string
    {
        $projectDescription = (string) ($project->description ?? '');
        $projectTargetUsers = (string) ($project->target_users ?? '');
        $projectName = (string) ($project->project_name ?? '');

        return <<<PROMPT
You are a senior software architect, business analyst, and solution designer.

Your task is to convert a user's simple software idea into a professional and structured Software Project Blueprint.

The blueprint must be practical, realistic, and suitable for academic projects, startups, or internal business systems.

Use modern software engineering practices.

Return the output in clean markdown format.

-----------------------------------
USER PROJECT IDEA:
{$projectDescription} and TARGET USERS: {$projectTargetUsers}
-----------------------------------

Generate the blueprint with the following sections:

1. Project Title
Create a professional project name based on the idea. Reference to the user's input is allowed but the title should be polished and marketable. User input: {$projectName}

2. Executive Summary
Write a short overview of what the system does and why it is valuable.

3. Problem Statement
Explain the real-world problem being solved.

4. Target Users
List who will use the system.

5. Key Features
Provide 10 detailed features.

6. Functional Requirements
Provide 10 clear system functions using: "The system must..."

7. Non-Functional Requirements
Provide 8 requirements covering:
- Security
- Performance
- Scalability
- Reliability
- Responsiveness
- Maintainability
- Accessibility
- Availability

8. User Stories
Provide at least 6 user stories using:
"As a [user], I want [goal], so that [benefit]"

9. Recommended Tech Stack
Suggest:
- Frontend
- Backend
- Database
- Authentication
- Hosting
- Optional AI/API integrations

10. Database Tables
Suggest core tables with columns, primary keys, and relationships.

11. API Modules
Suggest important APIs or modules.

12. Development Roadmap
Split into 4 phases:
Phase 1: MVP
Phase 2: Core Features
Phase 3: Advanced Features
Phase 4: Deployment & Optimization

13. Risk Analysis
List 5 project risks with mitigation.

14. Future Enhancements
List 5 future improvements.

Rules:
- Be realistic
- Avoid generic filler text
- Make features specific to the project idea
- Use professional language
- Use startup + academic level quality
- If project is simple, intelligently expand it
PROMPT;
    }

    public function show($projectId)
    {
        $project = Project::where('user_id', auth()->id())
                ->findOrFail($projectId);

        $blueprint = $project->blueprint;

        if (!$blueprint) {
            return response()->json([
                'message' => 'Blueprint not found for this project'
            ], 404);
        }

        return response()->json([
            'message' => 'Blueprint retrieved successfully',
            'data' => $blueprint,
        ]);
    }
}
