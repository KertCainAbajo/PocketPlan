<?php

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Public self-registration. Always creates a student, whatever the client sent.
 */
class RegisterStudent
{
    public function handle(string $name, string $email, string $password): User
    {
        return DB::transaction(function () use ($name, $email, $password) {
            $user = new User(['name' => $name, 'email' => $email, 'password' => $password]);
            $user->forceFill([
                'role' => UserRole::Student,
                'status' => UserStatus::Active,
                'last_login_at' => now(),
                // Registration only succeeds once the terms were accepted (validated in RegisterRequest).
                'terms_accepted_at' => now(),
            ])->save();

            $user->notificationPreference()->create();

            return $user;
        });
    }
}
