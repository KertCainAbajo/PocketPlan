<?php

namespace App\Actions\Auth;

use App\Exceptions\Auth\AccountDeactivatedException;
use App\Exceptions\Auth\StudentAccountRequiredException;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Verifies mobile-app credentials. Role and status are only revealed after the
 * password has been verified, so they cannot be probed without it.
 */
class AuthenticateStudent
{
    /**
     * @throws ValidationException when the email/password pair is wrong
     * @throws StudentAccountRequiredException when the account is an admin
     * @throws AccountDeactivatedException when the account is deactivated
     */
    public function handle(string $email, string $password): User
    {
        $user = User::query()->where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => [__('auth.failed')],
            ]);
        }

        if (! $user->isStudent()) {
            throw StudentAccountRequiredException::adminLogin();
        }

        if (! $user->isActive()) {
            throw new AccountDeactivatedException;
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return $user;
    }
}
