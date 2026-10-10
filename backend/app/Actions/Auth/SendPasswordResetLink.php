<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Password;

/**
 * Emails a reset link to active students only. Callers must give the same
 * response whether or not anything was sent, so accounts cannot be discovered.
 */
class SendPasswordResetLink
{
    public function handle(string $email): void
    {
        $user = User::query()->where('email', $email)->first();

        if ($user?->isStudent() && $user->isActive()) {
            Password::sendResetLink(['email' => $email]);
        }
    }
}
