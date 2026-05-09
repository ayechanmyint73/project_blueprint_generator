<?php

namespace App\Models;

use App\Models\Blueprint;
use App\Models\DevelopmentPlan;
use App\Models\TestingStrategy;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'user_id',
        'project_name',
        'description',
        'target_users',
        'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function blueprint()
    {
        return $this->hasOne(Blueprint::class)->where('is_current', true);
    }

    public function blueprints()
    {
        return $this->hasMany(Blueprint::class);
    }

    public function developmentPlan()
    {
        return $this->hasOne(DevelopmentPlan::class);
    }

    public function testingStrategies()
    {
        return $this->hasMany(TestingStrategy::class);
    }
}
