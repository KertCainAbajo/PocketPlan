<?php

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;

class ResetStudentPassword
{
    /**
     * Sets the new password and signs the account out of every device.
     *
     * @throws ValidationException when the token is invalid or expired
     */
    public function handle(string $email, string $token, string $password): void
    {
        $status = Password::reset(
            ['email' => $email, 'token' => $token, 'password' => $password],
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }
    }
}
