<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DevelopmentPlanPhase extends Model
{
    protected $fillable = [
        'development_plan_id',
        'title',
        'description',
        'sort_order',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'sort_order' => 'integer',
    ];

    public function developmentPlan(): BelongsTo
    {
        return $this->belongsTo(DevelopmentPlan::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(DevelopmentPlanTask::class)->orderBy('sort_order');
    }
}
