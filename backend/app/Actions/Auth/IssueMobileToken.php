<?php

namespace App\Actions\Auth;

use App\Models\User;
use Laravel\Sanctum\NewAccessToken;

/** Creates a Sanctum personal access token for the mobile app, with an expiry. */
class IssueMobileToken
{
    public function handle(User $user, ?string $deviceName = null): NewAccessToken
    {
        return $user->createToken(
            name: 'mobile:'.($deviceName ?: 'unknown-device'),
            abilities: ['*'],
            expiresAt: now()->addDays((int) config('pocketplan.token_ttl_days')),
        );
    }
}
