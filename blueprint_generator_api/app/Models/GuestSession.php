<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GuestSession extends Model
{
    protected $fillable = [
        'token',
        'blueprint_count',
        'expires_at',
    ];
}
