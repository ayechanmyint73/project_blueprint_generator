<?php

namespace App\Models;

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
}
