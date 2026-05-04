<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    private function isGuest(Request $request): bool
    {
        $user = $request->user();
        if (!$user) return false;

        // Do not rely on Sanctum abilities here: default tokens may include the wildcard "*",
        // which would make tokenCan('guest') true for non-guest users.
        return (($user->role ?? null) === 'guest');
    }

    public function store(Request $request)
    {
        $request->validate([
            'project_name' => 'required|string|max:255',
            'description' => 'required|string',
            'target_users' => 'required|string',
        ]);

        $user = $request->user();
        if ($this->isGuest($request)) {
            $alreadyHasProject = Project::where('user_id', $user->id)->exists();
            if ($alreadyHasProject) {
                return response()->json([
                    'message' => 'Guest users can only create 1 project blueprint. Please sign up to generate more.',
                ], 403);
            }
        }

        $project = Project::create([
            'user_id' => $user->id,
            'project_name' => $request->project_name,
            'description' => $request->description,
            'target_users' => $request->target_users,
            'status' => 'draft'
        ]);

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project,
        ], 201);
    }

    public function index()
    {
        return request()->user()->projects()->latest()->get();
    }

    public function show(Request $request, $id)
    {
        return Project::where('user_id', $request->user()->id)
        ->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $project = Project::where('user_id', $request->user()->id)
        ->findOrFail($id);

        $request->validate([
            'project_name' => 'required|string|max:255',
            'description' => 'required|string',
            'target_users' => 'required|string',
            'status' => 'required|in:draft,completed'
        ]);

        $project->update([
            'project_name' => $request->project_name,
            'description' => $request->description,
            'target_users' => $request->target_users,
            'status' => $request->status
        ]);

        return response()->json([
            'message' => 'Project updated successfully',
            'data' => $project,
        ]);
    }

    public function destroy($id)
    {
        $project = Project::where('user_id', request()->user()->id)
        ->findOrFail($id);

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully',
        ]);
    }
}
