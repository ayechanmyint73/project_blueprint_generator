<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('testing_strategies', function (Blueprint $table) {
            $table->boolean('is_checked')->default(false)->after('priority');
            $table->unsignedInteger('sort_order')->default(0)->after('is_checked');
        });
    }

    public function down(): void
    {
        Schema::table('testing_strategies', function (Blueprint $table) {
            $table->dropColumn(['is_checked', 'sort_order']);
        });
    }
};

