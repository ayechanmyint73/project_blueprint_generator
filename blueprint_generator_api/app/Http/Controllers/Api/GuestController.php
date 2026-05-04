<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class GuestController extends Controller
{
    public function login()
    {
        $uuid = (string) Str::uuid();
        $user = User::create([
            'name' => 'Guest',
            'email' => "guest_{$uuid}@guest.local",
            'password' => Hash::make(Str::random(48)),
            'role' => 'guest',
        ]);

        $token = $user->createToken('guest_token', ['guest'])->plainTextToken;

        return response()->json([
            'message' => 'Guest login successful',
            'user' => $user,
            'token' => $token,
            'is_guest' => true,
        ]);
    }

    public function generate(Request $request)
    {
        return response()->json([
            'message' => 'Guest generate endpoint is deprecated. Use /api/projects + /api/projects/{id}/generate with the guest token.',
        ]);
    }
}
