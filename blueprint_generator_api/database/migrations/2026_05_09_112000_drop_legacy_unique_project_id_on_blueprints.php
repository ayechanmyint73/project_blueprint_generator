<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        try {
            Schema::table('blueprints', function (Blueprint $table) {
                $table->dropUnique('blueprints_project_id_unique');
            });
        } catch (\Throwable $e) {
            // Index may not exist in some environments; ignore to keep migration idempotent.
        }
    }

    public function down(): void
    {
        try {
            Schema::table('blueprints', function (Blueprint $table) {
                $table->unique('project_id');
            });
        } catch (\Throwable $e) {
            // Ignore if unique already exists.
        }
    }
};

