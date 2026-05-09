<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class AiUsage extends Model
{
    public const TYPE_BLUEPRINT = 'blueprint';
    public const TYPE_ROADMAP = 'roadmap';
    public const TYPE_TESTING_STRATEGY = 'testing_strategy';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'type',
        'created_at',
    ];

    public static function countForToday(int $userId): int
    {
        $start = Carbon::today();
        $end = (clone $start)->endOfDay();

        return static::where('user_id', $userId)
            ->whereBetween('created_at', [$start, $end])
            ->count();
    }

    public static function record(int $userId, string $type): void
    {
        static::create([
            'user_id' => $userId,
            'type' => $type,
            'created_at' => now(),
        ]);
    }
}
