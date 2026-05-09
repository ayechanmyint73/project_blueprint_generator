<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlueprintSection extends Model
{
    protected $fillable = [
        'blueprint_id',
        'section_key',
        'title',
        'content',
        'sort_order',
    ];

    public function blueprint()
    {
        return $this->belongsTo(Blueprint::class);
    }
}

