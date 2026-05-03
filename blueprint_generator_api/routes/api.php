<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlueprintController;
use App\Http\Controllers\Api\DevelopmentPlanController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\ProjectController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


// Auth routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/profile', function (Request $request) {
        return $request->user();
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/projects', [ProjectController::class, 'store']);

    Route::get('/projects', [ProjectController::class, 'index']);

    Route::get('/projects/{id}', [ProjectController::class, 'show']);

    Route::put('/projects/{id}', [ProjectController::class, 'update']);

    Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);

    Route::post('/projects/{id}/generate', [BlueprintController::class, 'generate']);

    Route::get('/projects/{id}/blueprint', [BlueprintController::class, 'show']);

    Route::get('/projects/{id}/export-pdf', [PdfController::class, 'export']);

    Route::post('/projects/{id}/generate-plan', [DevelopmentPlanController::class, 'generate']);

    Route::get('/projects/{id}/plan', [DevelopmentPlanController::class, 'show']);

    Route::put('/projects/{id}/plan', [DevelopmentPlanController::class, 'upsert']);

    Route::put('/projects/{id}/plan/task', [DevelopmentPlanController::class, 'updateTask']);

    Route::get('/projects/{id}/plan-progress', [DevelopmentPlanController::class, 'progress']);
});
