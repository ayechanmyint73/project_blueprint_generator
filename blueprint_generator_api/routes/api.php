<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BlueprintController;
use App\Http\Controllers\Api\DevelopmentPlanController;
use App\Http\Controllers\Api\GuestController;
use App\Http\Controllers\Api\PdfController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectUploadController;
use App\Http\Controllers\Api\SettingController;
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
    // Project Input Routes
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::get('/projects/{id}', [ProjectController::class, 'show']);
    Route::put('/projects/{id}', [ProjectController::class, 'update']);
    Route::delete('/projects/{id}', [ProjectController::class, 'destroy']);
    Route::post('/projects/upload', [ProjectUploadController::class, 'uploadAndGenerate']);

    // Blueprint Generation Routes
    Route::post('/projects/{id}/generate', [BlueprintController::class, 'generate']);
    Route::post('/projects/{id}/generate-testing-strategy', [BlueprintController::class, 'generateTestingStrategy']);
    // Testing strategies (structured test cases)
    Route::get('/projects/{id}/testing-strategies', [\App\Http\Controllers\Api\TestingStrategyController::class, 'index']);
    Route::post('/projects/{id}/testing-strategies/generate', [\App\Http\Controllers\Api\TestingStrategyController::class, 'generate']);
    Route::post('/projects/{id}/testing-strategies', [\App\Http\Controllers\Api\TestingStrategyController::class, 'store']);
    Route::put('/projects/{id}/testing-strategies/{testCaseId}', [\App\Http\Controllers\Api\TestingStrategyController::class, 'update']);
    Route::delete('/projects/{id}/testing-strategies/{testCaseId}', [\App\Http\Controllers\Api\TestingStrategyController::class, 'destroy']);
    Route::get('/projects/{id}/blueprints', [BlueprintController::class, 'listVersions']);
    Route::get('/projects/{id}/blueprint', [BlueprintController::class, 'show']);
    Route::put('/projects/{id}/blueprint/sections/{sectionId}', [BlueprintController::class, 'updateSection']);
    Route::get('/projects/{id}/export-pdf', [PdfController::class, 'export']);

    // Development Plan Generation Routes
    Route::post('/projects/{id}/generate-plan', [DevelopmentPlanController::class, 'generate']);
    Route::get('/projects/{id}/plan', [DevelopmentPlanController::class, 'show']);
    Route::put('/projects/{id}/plan', [DevelopmentPlanController::class, 'upsert']);
    Route::put('/projects/{id}/plan/task', [DevelopmentPlanController::class, 'updateTask']);
    Route::get('/projects/{id}/plan-progress', [DevelopmentPlanController::class, 'progress']);

    // User Settings Routes
    Route::get('/settings/profile', [SettingController::class, 'profile']);
    Route::put('/settings/profile', [SettingController::class, 'updateProfile']);
    Route::put('/settings/password', [SettingController::class, 'changePassword']);
});

Route::post('/guest/login', [GuestController::class, 'login']);
Route::post('/guest/generate', [GuestController::class, 'generate']);
