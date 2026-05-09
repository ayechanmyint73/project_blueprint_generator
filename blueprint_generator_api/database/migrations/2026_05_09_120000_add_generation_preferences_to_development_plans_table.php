<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->enum('methodology', ['scrum', 'kanban', 'waterfall', 'hybrid'])->nullable()->after('status');
            $table->unsignedSmallInteger('developer_count')->nullable()->after('methodology');
            $table->date('start_date')->nullable()->after('developer_count');
            $table->date('end_date')->nullable()->after('start_date');
            $table->text('generation_notes')->nullable()->after('end_date');

            $table->index('methodology');
        });
    }

    public function down(): void
    {
        Schema::table('development_plans', function (Blueprint $table) {
            $table->dropIndex('development_plans_methodology_index');
            $table->dropColumn([
                'methodology',
                'developer_count',
                'start_date',
                'end_date',
                'generation_notes',
            ]);
        });
    }
};

