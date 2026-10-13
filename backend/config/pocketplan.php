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
    | Passwordless email codes: how long a code lives, how many wrong guesses
    | cancel it, and how long to wait before another code can be sent.
    */
    'email_code' => [
        'ttl_minutes' => 10,
        'max_attempts' => 5,
        'resend_seconds' => 60,
    ],

    /*
    | ISO 4217 currencies students may choose. Amounts are never converted:
    | the currency only changes how money is displayed.
    */
    'currencies' => ['PHP', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'HKD', 'AUD', 'CAD'],

    /*
    | Largest single amount accepted for an income, expense, budget or goal.
    */
    'max_amount' => '9999999999.99',

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
