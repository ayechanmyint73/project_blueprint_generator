<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AIService
{
    private ?int $lastTotalTokens = null;
    private ?int $lastHttpStatus = null;
    private ?string $lastError = null;

    public function getLastTotalTokens(): ?int
    {
        return $this->lastTotalTokens;
    }

    public function getLastHttpStatus(): ?int
    {
        return $this->lastHttpStatus;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    public function generate(string $prompt): ?string
    {
        $apiKey = (string) config('services.openai.api_key', '');
        $model = (string) config('services.openai.model', 'gpt-4.1-mini');
        $url = (string) config('services.openai.url', 'https://api.openai.com/v1/chat/completions');

        $this->lastTotalTokens = null;
        $this->lastHttpStatus = null;
        $this->lastError = null;

        if ($apiKey === '') {
            $this->lastError = 'AI provider is not configured (missing OPENAI_API_KEY)';
            Log::error($this->lastError);
            return null;
        }

        try {
            $response = Http::timeout(90)
                ->retry(1, 250)
                ->withToken($apiKey)
                ->acceptJson()
                ->post($url, [
                    'model' => $model,
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'You are a professional software architect who generates structured and practical outputs.',
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt,
                        ],
                    ],
                    'temperature' => 0.7,
                    'max_tokens' => 2000,
                ]);
        } catch (Throwable $e) {
            $this->lastError = 'AI provider request error';
            Log::error('OpenAI request threw exception', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }

        $this->lastHttpStatus = $response->status();

        if (!$response->successful()) {
            $this->lastError = 'AI provider returned an error response';
            Log::warning('OpenAI returned error response', [
                'status' => $response->status(),
                'body' => (string) $response->body(),
            ]);
            return null;
        }

        $json = $response->json();
        $this->lastTotalTokens = is_array($json) ? (data_get($json, 'usage.total_tokens') ?? null) : null;

        $content = data_get($json, 'choices.0.message.content');
        if (!is_string($content) || trim($content) === '') {
            $this->lastError = 'AI provider response missing content';
            Log::error('OpenAI response missing content', [
                'status' => $response->status(),
                'body' => (string) $response->body(),
            ]);
            return null;
        }

        return $content;
    }
}
