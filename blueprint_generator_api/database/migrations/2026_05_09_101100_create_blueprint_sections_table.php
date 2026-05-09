<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blueprint_sections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blueprint_id')->constrained('blueprints')->onDelete('cascade');
            $table->string('section_key', 100);
            $table->string('title', 150);
            $table->longText('content')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['blueprint_id', 'section_key']);
            $table->index(['blueprint_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blueprint_sections');
    }
};

