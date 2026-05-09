<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiUsage;
use App\Models\Blueprint;
use App\Models\Project;
use App\Services\AIService;
use App\Services\DocumentTextExtractionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProjectUploadController extends Controller
{
    public function uploadAndGenerate(
        Request $request,
        DocumentTextExtractionService $extractor,
        AIService $ai,
        BlueprintController $blueprintController
    ) {
        $requestId = (string) ($request->header('X-Request-Id') ?: Str::uuid());
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated',
                'request_id' => $requestId,
            ], 401);
        }

        if (AiUsage::countForToday((int) $user->id) >= 10) {
            return response()->json([
                'message' => 'Daily AI limit reached',
                'request_id' => $requestId,
            ], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:pdf,docx,txt|max:5120',
        ]);

        $uploadedFile = $request->file('file');
        $storedPath = $uploadedFile->store('temp', 'local');

        try {
            $extractedText = $extractor->extractFromUploadedFile($uploadedFile, 7000);
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($storedPath);
            return response()->json([
                'message' => $e->getMessage() ?: 'File extraction failed.',
                'request_id' => $requestId,
            ], 422);
        }

        try {
            $structured = $this->extractStructuredData($ai, $extractedText);
            if (!$structured) {
                return response()->json([
                    'message' => $ai->getLastError() ?? 'AI extraction failed.',
                    'request_id' => $requestId,
                ], 502);
            }

            $project = Project::create([
                'user_id' => $user->id,
                'project_name' => (string) ($structured['project_title'] ?? 'Untitled Project'),
                'description' => (string) ($structured['project_description'] ?? ''),
                'target_users' => (string) ($structured['target_users'] ?? ''),
                'status' => 'generated',
            ]);

            $blueprintPrompt = $blueprintController->buildPrompt($project);
            $blueprintContent = $ai->generate($blueprintPrompt);

            if (!is_string($blueprintContent) || trim($blueprintContent) === '') {
                return response()->json([
                    'message' => $ai->getLastError() ?? 'Blueprint generation failed.',
                    'request_id' => $requestId,
                ], 502);
            }

            $blueprint = Blueprint::updateOrCreate(
                ['project_id' => $project->id],
                [
                    'content' => $blueprintContent,
                    'model' => (string) config('services.openai.model', 'gpt-4.1-mini'),
                    'token_used' => $ai->getLastTotalTokens(),
                ]
            );

            AiUsage::record((int) $user->id, AiUsage::TYPE_BLUEPRINT);

            return response()->json([
                'message' => 'File processed and blueprint generated successfully.',
                'project' => $project,
                'extracted_data' => $structured,
                'blueprint' => $blueprint->content,
                'request_id' => $requestId,
            ]);
        } catch (\Throwable $e) {
            Log::error('Upload blueprint flow failed', [
                'request_id' => $requestId,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Failed to process uploaded file.',
                'request_id' => $requestId,
            ], 500);
        } finally {
            Storage::disk('local')->delete($storedPath);
        }
    }

    private function extractStructuredData(AIService $ai, string $text): ?array
    {
        $prompt = <<<PROMPT
Analyze the following document and extract structured project information.

Document:
{$text}

Return ONLY JSON in this format:
{
"project_title": "",
"project_description": "",
"target_users": "",
"key_features": []
}

Rules:
- Be concise and accurate
- Do not hallucinate missing information
- If data is unclear, infer reasonably
- Keep features practical and relevant
PROMPT;

        $content = $ai->chat(
            [
                [
                    'role' => 'system',
                    'content' => 'You are a software analyst. Extract structured project details from raw documents.',
                ],
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ],
            [
                'model' => 'gpt-4.1-mini',
                'temperature' => 0.5,
                'max_tokens' => 800,
                'timeout' => 30,
            ]
        );

        if (!is_string($content) || trim($content) === '') {
            return null;
        }

        $decoded = json_decode($this->normalizeJson($content), true);
        if (!is_array($decoded)) {
            return null;
        }

        return [
            'project_title' => (string) ($decoded['project_title'] ?? ''),
            'project_description' => (string) ($decoded['project_description'] ?? ''),
            'target_users' => (string) ($decoded['target_users'] ?? ''),
            'key_features' => array_values(array_filter((array) ($decoded['key_features'] ?? []), fn ($value) => is_string($value) && trim($value) !== '')),
        ];
    }

    private function normalizeJson(string $content): string
    {
        $normalized = trim($content);
        $normalized = preg_replace('/^```json\s*/i', '', $normalized) ?? $normalized;
        $normalized = preg_replace('/\s*```$/', '', $normalized) ?? $normalized;
        return trim($normalized);
    }
}
