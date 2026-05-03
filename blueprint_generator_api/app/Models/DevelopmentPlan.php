<?php

namespace App\Models;

use App\Models\Project;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DevelopmentPlan extends Model
{
    protected $fillable = [
        'project_id',
        'source_type',
        'status',
        'total_tasks',
        'completed_tasks',
        'progress_percent',
        'generated_at',
    ];

    protected $casts = [
        'total_tasks' => 'integer',
        'completed_tasks' => 'integer',
        'progress_percent' => 'integer',
        'generated_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'draft',
        'progress_percent' => 0,
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function phases(): HasMany
    {
        return $this->hasMany(DevelopmentPlanPhase::class)->orderBy('sort_order');
    }

    public function tasks()
    {
        return $this->hasManyThrough(DevelopmentPlanTask::class, DevelopmentPlanPhase::class);
    }

    public function recalculateProgress(): void
    {
        $total = $this->tasks()->count();
        $completed = $this->tasks()->completed()->count();

        $this->total_tasks = $total;
        $this->completed_tasks = $completed;
        $this->progress_percent = $total > 0 ? (int) round(($completed / $total) * 100) : 0;
        $this->save();
    }

    public static function findByProjectOrCreate(int $projectId): self
    {
        return self::firstOrCreate([
            'project_id' => $projectId,
        ], [
            'source_type' => 'manual',
            'status' => 'draft',
        ]);
    }
}

