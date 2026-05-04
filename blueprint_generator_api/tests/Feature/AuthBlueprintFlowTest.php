<?php

namespace Tests\Feature;

use App\Models\Blueprint;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthBlueprintFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_registered_user_can_login_and_generate_multiple_blueprints_across_projects(): void
    {
        Config::set('services.openai.api_key', 'test-key');
        Config::set('services.openai.url', 'https://openai.example.test/chat/completions');
        Config::set('services.openai.model', 'test-model');

        Http::fake([
            'openai.example.test/*' => Http::response([
                'choices' => [
                    ['message' => ['content' => '# Blueprint content']],
                ],
                'usage' => [
                    'total_tokens' => 123,
                ],
            ], 200),
        ]);

        $password = 'Password123!';
        $user = User::factory()->create([
            'email' => 'student@example.com',
            'password' => bcrypt($password),
            'role' => 'user',
        ]);

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => $password,
        ]);

        $login->assertOk()->assertJsonStructure(['token']);
        $token = $login->json('token');

        $projectA = $this->withToken($token)->postJson('/api/projects', [
            'project_name' => 'Project A',
            'description' => 'A desc',
            'target_users' => 'Students',
        ])->assertCreated()->json('project');

        $projectB = $this->withToken($token)->postJson('/api/projects', [
            'project_name' => 'Project B',
            'description' => 'B desc',
            'target_users' => 'Teachers',
        ])->assertCreated()->json('project');

        $this->withToken($token)
            ->postJson("/api/projects/{$projectA['id']}/generate")
            ->assertOk();

        $this->withToken($token)
            ->postJson("/api/projects/{$projectB['id']}/generate")
            ->assertOk();

        $this->assertSame(2, Blueprint::count());
        $this->assertSame(2, Project::where('user_id', $user->id)->count());
    }

    public function test_registered_user_can_regenerate_same_project_without_creating_duplicate_blueprints(): void
    {
        Config::set('services.openai.api_key', 'test-key');
        Config::set('services.openai.url', 'https://openai.example.test/chat/completions');
        Config::set('services.openai.model', 'test-model');

        Http::fakeSequence()
            ->push([
                'choices' => [
                    ['message' => ['content' => '# First blueprint']],
                ],
                'usage' => [
                    'total_tokens' => 111,
                ],
            ], 200)
            ->push([
                'choices' => [
                    ['message' => ['content' => '# Second blueprint']],
                ],
                'usage' => [
                    'total_tokens' => 222,
                ],
            ], 200);

        $user = User::factory()->create(['role' => 'user']);
        Sanctum::actingAs($user);

        $project = Project::create([
            'user_id' => $user->id,
            'project_name' => 'P',
            'description' => 'D',
            'target_users' => 'T',
            'status' => 'draft',
        ]);

        $this->postJson("/api/projects/{$project->id}/generate")->assertOk();
        $this->postJson("/api/projects/{$project->id}/generate")->assertOk();

        $this->assertSame(1, Blueprint::count());
        $this->assertSame('# Second blueprint', Blueprint::first()->content);
    }
}
