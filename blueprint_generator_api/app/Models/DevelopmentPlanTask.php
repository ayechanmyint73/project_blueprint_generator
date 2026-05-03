<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DevelopmentPlanTask extends Model
{
    protected $fillable = [
        'development_plan_phase_id',
        'title',
        'status',
        'priority',
        'sort_order',
        'completed_at',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function phase(): BelongsTo
    {
        return $this->belongsTo(DevelopmentPlanPhase::class, 'development_plan_phase_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopePending($query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }
}
