<?php

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\Auth\AccountDeactivatedException;
use App\Exceptions\Auth\StudentAccountRequiredException;
use App\Models\User;
use App\Services\Auth\GoogleIdTokenVerifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Signs a student in with a verified Google identity:
 *  - known Google account → that user;
 *  - email already registered → link Google to it (Google has verified the email);
 *  - otherwise → create a new student, which requires accepting the terms.
 * Admin accounts can never sign in this way.
 */
class AuthenticateWithGoogle
{
    public function __construct(private readonly GoogleIdTokenVerifier $verifier) {}

    /**
     * @return array{user: User, created: bool}
     */
    public function handle(string $idToken, bool $acceptedTerms): array
    {
        $profile = $this->verifier->verify($idToken);

        return DB::transaction(function () use ($profile, $acceptedTerms) {
            $user = User::query()->where('google_id', $profile['sub'])->lockForUpdate()->first()
                ?? User::query()->where('email', $profile['email'])->lockForUpdate()->first();

            if ($user) {
                $this->assertCanSignIn($user);
                $user->forceFill(['google_id' => $profile['sub'], 'last_login_at' => now()])->save();

                return ['user' => $user, 'created' => false];
            }

            if (! $acceptedTerms) {
                throw ValidationException::withMessages([
                    'terms' => ['Please accept the Terms of Service and Privacy Policy to continue.'],
                ]);
            }

            // Google-only accounts get an unusable random password; "Forgot password" can set a real one.
            $user = new User(['name' => $profile['name'], 'email' => $profile['email'], 'password' => Str::password(40)]);
            $user->forceFill([
                'google_id' => $profile['sub'],
                'role' => UserRole::Student,
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
                'terms_accepted_at' => now(),
                'last_login_at' => now(),
            ])->save();
            $user->notificationPreference()->create();

            return ['user' => $user, 'created' => true];
        });
    }

    private function assertCanSignIn(User $user): void
    {
        if (! $user->isStudent()) {
            throw StudentAccountRequiredException::adminLogin();
        }

        if (! $user->isActive()) {
            throw new AccountDeactivatedException;
        }
    }
}
