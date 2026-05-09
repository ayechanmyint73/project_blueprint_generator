<?php

namespace App\Models;

use App\Models\Project;
use App\Models\BlueprintSection;
use Illuminate\Database\Eloquent\Model;

class Blueprint extends Model
{
    protected $fillable = [
        'project_id',
        'version',
        'is_current',
        'model',
        'token_used',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function sections()
    {
        return $this->hasMany(BlueprintSection::class)->orderBy('sort_order')->orderBy('id');
    }
}
