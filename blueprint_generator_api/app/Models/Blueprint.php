<?php

namespace App\Models;

use App\Models\Project;
use Illuminate\Database\Eloquent\Model;

class Blueprint extends Model
{
    protected $fillable = [
        'project_id',
        'content',
        'model',
        'token_used',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
