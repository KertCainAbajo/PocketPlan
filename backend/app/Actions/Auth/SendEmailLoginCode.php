<?php

namespace App\Actions\Auth;

use App\Models\EmailLoginCode;
use App\Notifications\EmailLoginCodeNotification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Emails a fresh 6-digit code. The reply never says whether the address has an
 * account, so the endpoint cannot be used to discover who uses PocketPlan.
 */
class SendEmailLoginCode
{
    /** @throws ValidationException when a code was sent too recently */
    public function handle(string $email): void
    {
        $latest = EmailLoginCode::query()->where('email', $email)->latest('id')->first();
        $wait = (int) config('pocketplan.email_code.resend_seconds');
        if ($latest && $latest->consumed_at === null && $latest->created_at->diffInSeconds(now()) < $wait) {
            $seconds = (int) ceil($wait - $latest->created_at->diffInSeconds(now()));
            throw ValidationException::withMessages(['email' => ["Please wait {$seconds} seconds before asking for a new code."]]);
        }

        // Only the newest code works; older ones are removed.
        EmailLoginCode::query()->where('email', $email)->delete();

        $code = (string) random_int(100000, 999999);
        EmailLoginCode::query()->create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes((int) config('pocketplan.email_code.ttl_minutes')),
        ]);

        Notification::route('mail', $email)->notify(new EmailLoginCodeNotification($code));
    }
}
