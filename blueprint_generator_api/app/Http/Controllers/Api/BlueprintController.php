<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiUsage;
use App\Models\Project;
use App\Models\Blueprint;
use App\Services\AIService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class BlueprintController extends Controller
{
    private function isGuest(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;

        // Do not rely on Sanctum abilities here: default tokens may include the wildcard "*",
        // which would make tokenCan('guest') true for non-guest users.
        return (($user->role ?? null) === 'guest');
    }

    public function generate(Request $request, $projectId, AIService $ai)
    {
        $requestId = (string) (request()->header('X-Request-Id') ?: Str::uuid());
        $start = microtime(true);
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated',
                'request_id' => $requestId,
            ], 401);
        }
        $userId = (int) $user->id;

        if (AiUsage::countForToday($userId) >= 10) {
            return response()->json([
                'message' => 'Daily AI limit reached',
                'request_id' => $requestId,
            ], 403);
        }

        if ($this->isGuest($request)) {
            $alreadyGenerated = Blueprint::whereHas('project', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            })->exists();

            if ($alreadyGenerated) {
                return response()->json([
                    'message' => 'Guest users can only generate 1 blueprint. Please sign up to generate more.',
                ], 403);
            }
        }

        $project = Project::where('user_id', $userId)->findOrFail($projectId);

        $prompt = $this->buildPrompt($project);

        Log::info('Blueprint generate started', [
            'request_id' => $requestId,
            'user_id' => $userId,
            'project_id' => $project->id,
            'prompt_chars' => strlen($prompt),
        ]);

        $content = $ai->generate($prompt);
        if (!is_string($content) || trim($content) === '') {
            $status = $ai->getLastHttpStatus();
            $err = $ai->getLastError() ?? 'AI generation failed';

            Log::warning('Blueprint generate failed', [
                'request_id' => $requestId,
                'user_id' => $userId,
                'project_id' => $project->id,
                'provider_status' => $status,
                'error' => $err,
            ]);

            return response()->json([
                'message' => $err,
                'provider_status' => $status,
                'request_id' => $requestId,
            ], $status === null ? 500 : 502);
        }

        AiUsage::record($userId, AiUsage::TYPE_BLUEPRINT);

        $blueprint = Blueprint::updateOrCreate(
            ['project_id' => $project->id],
            [
                'content' => $content,
                'model' => (string) config('services.openai.model', 'gpt-4.1-mini'),
                'token_used' => $ai->getLastTotalTokens(),
            ]
        );

        $project->update([
            'status' => 'generated'
        ]);

        Log::info('Blueprint generate completed', [
            'request_id' => $requestId,
            'user_id' => $userId,
            'project_id' => $project->id,
            'model' => (string) config('services.openai.model', 'gpt-4.1-mini'),
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

Your task is to convert a user's software idea into a professional, structured, and implementation-ready Software Project Blueprint.

The blueprint must be:
- Practical and realistic
- Suitable for final year academic projects and real-world applications
- Clear, concise, and well-structured
- Do not include any extra word or content that is not directly relevant to the project idea

-----------------------------------
USER PROJECT IDEA:
{$projectDescription}

TARGET USERS:
{$projectTargetUsers}

PROJECT NAME (optional reference):
{$projectName}
-----------------------------------

Instructions:

- Use clear markdown headings (## for sections)
- Avoid long paragraphs
- Do NOT repeat the same ideas across sections
- Avoid generic or vague statements
- Ensure all content is specific to the project idea
- Keep explanations practical and implementable

-----------------------------------

Generate the blueprint with the following sections:

## 1. Project Title
Create a professional and marketable project name.

## 2. Executive Summary
Briefly explain what the system does and its value.

## 3. Problem Statement
Clearly describe the real-world problem.

## 4. Target Users
List and briefly describe user types.

## 5. Key Features
Provide 8–10 specific and practical features with proper explanations.

## 6. Functional Requirements
Provide 8–10 statements using:
"The system must..."

## 7. Non-Functional Requirements
Provide 6–8 requirements covering:
security, performance, scalability, reliability, usability, availability

## 8. User Stories
Provide 5–6 user stories:
"As a [user], I want [goal], so that [benefit]"

## 9. Recommended Tech Stack
Suggest:
- Frontend
- Backend
- Database
- Authentication
- Hosting
- Optional APIs (only if relevant)

Briefly justify key choices.

## 10. Database Design
Return this section as a markdown table only (no bullet list) using exactly these columns:
| Table Name | Key Columns | Relationships |

Rules for this table:
- Include 5–8 core tables
- Use specific table names and realistic column names
- In "Relationships", clearly state foreign key links (e.g., "project_id -> projects.id")
- Keep each row concise and implementation-ready

## 11. Risk Analysis
List 4–5 realistic risks with mitigation strategies.

## 12. Future Enhancements
List 4–5 meaningful improvements.

## 13. Flow Chart
Provide a clear markdown flow chart in Mermaid format only, using this structure:
```mermaid
flowchart TD
  A[Start] --> B[...]
```

-----------------------------------

Final Rules:

- Be realistic and implementation-focused
- Avoid over-engineering or complex unnecessary technologies
- Keep the output clean and readable for PDF export
- Ensure consistency across all sections
PROMPT;

    }

    public function show(Request $request, $projectId)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated',
            ], 401);
        }

        $project = Project::where('user_id', $user->id)
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

    public function generateTestingStrategy(Request $request, $projectId, AIService $ai)
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
        if (AiUsage::countForToday($userId) >= 10) {
            return response()->json([
                'message' => 'Daily AI limit reached',
                'request_id' => $requestId,
            ], 403);
        }

        $project = Project::where('user_id', $userId)->findOrFail($projectId);

        $prompt = <<<PROMPT
You are a senior QA lead.

Generate a practical testing strategy for this software project.

Project Name:
{$project->project_name}

Project Description:
{$project->description}

Target Users:
{$project->target_users}

Return only one markdown table with exactly these columns:
| Test Type | Scope | Sample Test Cases | Tools |

Rules:
- Provide 8-12 rows
- Include unit, integration, API, UI, security, performance, and UAT coverage
- Keep test cases concrete and implementation-ready
- Do not include explanations outside the table
PROMPT;

        $content = $ai->chat(
            [
                [
                    'role' => 'system',
                    'content' => 'You produce concise, implementation-ready QA outputs.',
                ],
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ],
            [
                'model' => 'gpt-4.1-mini',
                'temperature' => 0.5,
                'max_tokens' => 900,
                'timeout' => 30,
            ]
        );

        if (!is_string($content) || trim($content) === '') {
            return response()->json([
                'message' => $ai->getLastError() ?? 'Failed to generate testing strategy.',
                'request_id' => $requestId,
            ], 502);
        }

        AiUsage::record($userId, AiUsage::TYPE_TESTING_STRATEGY);

        return response()->json([
            'message' => 'Testing strategy generated successfully',
            'data' => [
                'content' => $content,
                'model' => 'gpt-4.1-mini',
            ],
            'request_id' => $requestId,
        ]);
    }
}
