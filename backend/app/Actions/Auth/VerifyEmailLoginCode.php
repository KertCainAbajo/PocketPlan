<?php

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Exceptions\Auth\AccountDeactivatedException;
use App\Exceptions\Auth\StudentAccountRequiredException;
use App\Models\EmailLoginCode;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Checks an emailed code. An existing student is signed in; a new email needs a
 * name (and accepted terms) and then gets a new account. When the name is still
 * missing the code is left unused so the app can ask for it and try again.
 */
class VerifyEmailLoginCode
{
    /**
     * @return array{user: User|null, created: bool, needs_name: bool}
     *
     * @throws ValidationException for a wrong, expired or used-up code
     */
    public function handle(string $email, string $code, ?string $name, bool $acceptedTerms): array
    {
        // Errors are returned from the transaction and thrown afterwards, so a wrong
        // guess still counts: throwing inside would roll the attempt counter back.
        $result = DB::transaction(function () use ($email, $code, $name, $acceptedTerms) {
            $record = EmailLoginCode::query()->where('email', $email)->latest('id')->lockForUpdate()->first();

            if (! $record || ! $record->isUsable()) {
                return ['error' => ['code' => 'This code has expired. Request a new one.']];
            }

            if (! Hash::check($code, $record->code_hash)) {
                $record->increment('attempts');
                $left = (int) config('pocketplan.email_code.max_attempts') - $record->attempts;

                return ['error' => ['code' => $left > 0
                    ? "That code is not right. {$left} ".($left === 1 ? 'try' : 'tries').' left.'
                    : 'Too many wrong tries. Request a new code.']];
            }

            $user = User::query()->where('email', $email)->lockForUpdate()->first();

            if ($user) {
                if (! $user->isStudent()) {
                    throw StudentAccountRequiredException::adminLogin();
                }
                if (! $user->isActive()) {
                    throw new AccountDeactivatedException;
                }
                $record->forceFill(['consumed_at' => now()])->save();
                $user->forceFill(['last_login_at' => now(), 'email_verified_at' => $user->email_verified_at ?? now()])->save();

                return ['user' => $user, 'created' => false, 'needs_name' => false];
            }

            if ($name === null || trim($name) === '') {
                return ['user' => null, 'created' => false, 'needs_name' => true];
            }

            if (! $acceptedTerms) {
                return ['error' => ['terms' => 'Please accept the Terms of Service and Privacy Policy to continue.']];
            }

            // Passwordless accounts get an unusable random password; "Forgot password" can set a real one.
            $user = new User(['name' => trim($name), 'email' => $email, 'password' => Str::password(40)]);
            $user->forceFill([
                'role' => UserRole::Student,
                'status' => UserStatus::Active,
                'email_verified_at' => now(),
                'terms_accepted_at' => now(),
                'last_login_at' => now(),
            ])->save();
            $user->notificationPreference()->create();
            $record->forceFill(['consumed_at' => now()])->save();

            return ['user' => $user, 'created' => true, 'needs_name' => false];
        });

        if (isset($result['error'])) {
            throw ValidationException::withMessages(array_map(fn (string $message) => [$message], $result['error']));
        }

        return $result;
    }
}
