<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Catch lazy loading, silently dropped attributes and missing columns during development.
        Model::shouldBeStrict(! $this->app->environment('production'));

        if ($this->app->environment('production')) {
            URL::forceScheme('https');
            // Refuse migrate:fresh, db:wipe and similar on the production database.
            DB::prohibitDestructiveCommands();
        }

        Password::defaults(fn () => Password::min(8)->letters()->numbers());

        // Login / register / password reset: per email + IP, plus a per-IP ceiling.
        RateLimiter::for('auth', function (Request $request) {
            $email = Str::lower((string) $request->input('email'));

            return [
                Limit::perMinute(5)->by($email.'|'.$request->ip()),
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));

        // Browser-based Google sign-in: one attempt makes three requests (start, Google's
        // return, code exchange), so it needs more room than password login. Each
        // attempt is still single-use and protected by an encrypted state and nonce.
        RateLimiter::for('google-oauth', fn (Request $request) => Limit::perMinute(30)->by($request->ip()));

        RateLimiter::for('admin', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        // Students reset their password from the mobile app via a deep link.
        ResetPassword::createUrlUsing(fn ($user, string $token) => config('pocketplan.mobile_reset_url')
            .'?'.http_build_query(['token' => $token, 'email' => $user->getEmailForPasswordReset()]));
    }
}
