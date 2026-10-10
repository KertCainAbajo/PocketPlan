<?php

namespace App\Actions\Admin;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * The only code path that creates an admin. Called from the
 * pocketplan:create-admin command and the database seeder.
 */
class CreateAdminAccount
{
    /**
     * @throws ValidationException
     */
    public function handle(string $name, string $email, string $password): User
    {
        $email = mb_strtolower(trim($email));

        Validator::make(compact('name', 'email', 'password'), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(12)->letters()->mixedCase()->numbers()],
        ])->validate();

        $admin = new User(['name' => $name, 'email' => $email, 'password' => $password]);
        $admin->forceFill([
            'role' => UserRole::Admin,
            'status' => UserStatus::Active,
            'must_change_password' => true,
            'email_verified_at' => now(),
        ])->save();

        return $admin;
    }
}
