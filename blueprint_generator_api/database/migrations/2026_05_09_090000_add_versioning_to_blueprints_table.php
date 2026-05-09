<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('blueprints', function (Blueprint $table) {
            $table->unsignedInteger('version')->default(1)->after('project_id');
            $table->boolean('is_current')->default(true)->after('version');
            $table->index(['project_id', 'is_current']);
            $table->unique(['project_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::table('blueprints', function (Blueprint $table) {
            $table->dropUnique('blueprints_project_id_version_unique');
            $table->dropIndex('blueprints_project_id_is_current_index');
            $table->dropColumn(['version', 'is_current']);
        });
    }
};

