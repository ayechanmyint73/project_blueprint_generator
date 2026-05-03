<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('development_plans', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->enum('source_type', ['ai', 'manual', 'hybrid'])->default('manual');
            $table->enum('status', ['draft', 'generating', 'ready', 'archived'])->default('draft');
            $table->unsignedInteger('total_tasks')->default(0);
            $table->unsignedInteger('completed_tasks')->default(0);
            $table->unsignedInteger('progress_percent')->default(0);
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('development_plans');
    }
};
