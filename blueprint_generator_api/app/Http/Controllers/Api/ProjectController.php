<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'project_name' => 'required|string|max:255',
            'description' => 'required|string',
            'target_users' => 'required|string',
        ]);

        $project = Project::create([
            'user_id' => $request->user()->id,
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
        return auth()->user()->projects()->latest()->get();
    }

    public function show($id)
    {
        return Project::where('user_id', auth()->id())
        ->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $project = Project::where('user_id', auth()->id())
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
        $project = Project::where('user_id', auth()->id())
        ->findOrFail($id);

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully',
        ]);
    }
}
