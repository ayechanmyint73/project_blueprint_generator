<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Project;

class TestingStrategy extends Model
{
    protected $table = 'testing_strategies';

    protected $fillable = [
        'project_id',
        'test_case',
        'test_type',
        'description',
        'priority',
        'is_checked',
        'sort_order',
    ];

    protected $casts = [
        'is_checked' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
