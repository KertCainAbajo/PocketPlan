<?php

return [

    /*
    | Deep link opened by the password-reset email for students. The mobile app
    | receives ?token=...&email=... and calls POST /api/v1/reset-password.
    */
    'mobile_reset_url' => env('MOBILE_RESET_URL', 'pocketplan://reset-password'),

    /*
    | Lifetime of mobile API tokens, in days. Applied when tokens are created.
    */
    'token_ttl_days' => (int) env('MOBILE_TOKEN_TTL_DAYS', 30),

    /*
    | Initial admin account. Used only by `php artisan pocketplan:create-admin`
    | and the database seeder. Never commit real values.
    */
    'admin' => [
        'name' => env('ADMIN_NAME', 'PocketPlan Admin'),
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

];
