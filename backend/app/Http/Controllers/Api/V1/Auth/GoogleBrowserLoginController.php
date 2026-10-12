<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\AuthenticateWithGoogle;
use App\Actions\Auth\IssueMobileToken;
use App\Exceptions\Auth\AccountDeactivatedException;
use App\Exceptions\Auth\StudentAccountRequiredException;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AuthTokenResource;
use App\Models\User;
use App\Services\Auth\GoogleIdTokenVerifier;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Browser-based "Continue with Google", usable from Expo Go (no native code):
 *
 *  1. App opens   GET  /auth/google/redirect?redirect_uri=<app link>  in a browser sheet
 *  2. We redirect to Google (OpenID Connect, response_type=id_token, form_post)
 *  3. Google posts the ID token to POST /auth/google/callback; we verify it, sign
 *     the student in and send the browser back to the app with a one-time code
 *  4. App calls   POST /auth/google/exchange {code}  and receives its API token
 *
 * The API token itself never appears in a URL.
 */
class GoogleBrowserLoginController extends Controller
{
    private const STATE_TTL_MINUTES = 30;

    private const CODE_TTL_SECONDS = 120;

    public function redirect(Request $request): RedirectResponse|Response
    {
        $request->validate([
            'redirect_uri' => ['required', 'string', 'max:500'],
            'terms' => ['sometimes', 'boolean'],
        ]);

        $appRedirect = $request->string('redirect_uri')->toString();
        if (! $this->isAllowedAppRedirect($appRedirect)) {
            return $this->page('This sign-in link is not allowed.', 400);
        }

        $clientId = config('services.google.client_ids')[0] ?? null;
        $callback = config('services.google.redirect_uri');
        if (! $clientId || ! $callback) {
            return $this->backToApp($appRedirect, ['error' => 'Google sign-in is not configured on this server.']);
        }

        // The encrypted state carries a signed destination, nonce, and age limit.
        // The cache marker prevents replays when cache is shared by all workers.
        $attemptId = Str::random(32);
        $nonce = Str::random(40);
        $state = Crypt::encryptString(json_encode([
            'id' => $attemptId,
            'redirect' => $appRedirect,
            'nonce' => $nonce,
            'terms' => $request->boolean('terms'),
            'issued_at' => now()->timestamp,
        ], JSON_THROW_ON_ERROR));
        $attemptKey = "google-oauth:attempt:{$attemptId}";
        Cache::put($attemptKey, true, now()->addMinutes(self::STATE_TTL_MINUTES));
        Log::info('Google OAuth attempt stored', [
            'attempt' => substr(hash('sha256', $attemptId), 0, 12),
            'cache_store' => Cache::getDefaultDriver(),
            'stored' => Cache::has($attemptKey),
        ]);

        return redirect()->away('https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $callback,
            'response_type' => 'id_token',
            'response_mode' => 'form_post',
            'scope' => 'openid email profile',
            'state' => $state,
            'nonce' => $nonce,
            'prompt' => 'select_account',
        ]));
    }

    /** Google posts here (form_post) after the student picks an account, or cancels. */
    public function callback(Request $request, GoogleIdTokenVerifier $verifier, AuthenticateWithGoogle $google): RedirectResponse|Response
    {
        $session = $this->decodeState((string) $request->input('state'));
        if ($session === null) {
            return $this->page('This sign-in link is not valid. Go back to PocketPlan and try again.', 400);
        }

        $appRedirect = $session['redirect'];
        $resultKey = "google-oauth:result:{$session['id']}";
        $attemptKey = "google-oauth:attempt:{$session['id']}";

        Log::info('Google OAuth callback received', [
            'attempt' => substr(hash('sha256', $session['id']), 0, 12),
            'host' => $request->getHost(),
            'cache_store' => Cache::getDefaultDriver(),
            'attempt_exists' => Cache::has($attemptKey),
            'result_exists' => Cache::has($resultKey),
        ]);

        // Android may deliver the same callback through both the browser result
        // and the app deep link. Reuse its result instead of treating the second
        // delivery as an expired sign-in.
        if ($code = Cache::get($resultKey)) {
            return $this->backToApp($appRedirect, ['code' => $code]);
        }

        try {
            return Cache::lock("google-oauth:lock:{$session['id']}", 120)->block(30, function () use ($request, $session, $appRedirect, $attemptKey, $resultKey, $verifier, $google) {
                if ($code = Cache::get($resultKey)) {
                    return $this->backToApp($appRedirect, ['code' => $code]);
                }

                $attemptExists = Cache::pull($attemptKey);
                $stateAge = now()->timestamp - $session['issued_at'];
                if (! $attemptExists || $stateAge < 0 || $stateAge > self::STATE_TTL_MINUTES * 60) {
                    Log::warning('Google OAuth callback used an expired or already consumed attempt', [
                        'attempt' => substr(hash('sha256', $session['id']), 0, 12),
                        'host' => $request->getHost(),
                        'state_age_seconds' => $stateAge,
                    ]);

                    return $this->backToApp($appRedirect, ['error' => 'That Google sign-in had expired. Please tap Continue with Google again.']);
                }

                if ($request->filled('error') || ! $request->filled('id_token')) {
                    return $this->backToApp($appRedirect, ['error' => $request->input('error') === 'access_denied' ? 'cancelled' : 'Google sign-in failed. Please try again.']);
                }

                try {
                    $profile = $verifier->verify($request->string('id_token')->toString());
                    if (! hash_equals($session['nonce'], (string) $profile['nonce'])) {
                        return $this->backToApp($appRedirect, ['error' => 'Google sign-in failed. Please try again.']);
                    }

                    ['user' => $user] = $google->signIn($profile, (bool) $session['terms']);
                } catch (ValidationException $e) {
                    return $this->backToApp($appRedirect, ['error' => collect($e->errors())->flatten()->first()]);
                } catch (StudentAccountRequiredException|AccountDeactivatedException|HttpException $e) {
                    return $this->backToApp($appRedirect, ['error' => $e->getMessage()]);
                }

                $code = Str::random(48);
                Cache::put("google-oauth:code:{$code}", $user->id, now()->addSeconds(self::CODE_TTL_SECONDS));
                Cache::put($resultKey, $code, now()->addSeconds(self::CODE_TTL_SECONDS));

                return $this->backToApp($appRedirect, ['code' => $code]);
            });
        } catch (LockTimeoutException) {
            return $this->backToApp($appRedirect, ['error' => 'Google sign-in is still finishing. Please return to PocketPlan.']);
        }
    }

    /** Trade the one-time code for an API token. Each code works once, for two minutes. */
    public function exchange(Request $request, IssueMobileToken $issueToken): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:48'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $code = $request->string('code')->toString();
        $userId = Cache::pull('google-oauth:code:'.$code);
        $user = $userId ? User::query()->find($userId) : null;

        if (! $user) {
            Log::warning('Google OAuth exchange code missing', [
                'code' => substr(hash('sha256', $code), 0, 12),
                'cache_store' => Cache::getDefaultDriver(),
            ]);
            throw ValidationException::withMessages(['code' => ['This sign-in has expired. Please try again.']]);
        }

        $token = $issueToken->handle($user, $request->input('device_name'));
        Log::info('Google OAuth exchange completed', ['user_id' => $user->id, 'token_id' => $token->accessToken->id]);

        return (new AuthTokenResource($token, $user))->response();
    }

    /**
     * @return array{id: string, redirect: string, nonce: string, terms: bool, issued_at: int}|null
     */
    private function decodeState(string $state): ?array
    {
        try {
            $data = json_decode(Crypt::decryptString($state), true, 4, JSON_THROW_ON_ERROR);
        } catch (DecryptException|\JsonException) {
            return null;
        }

        $valid = is_array($data)
            && is_string($data['id'] ?? null)
            && is_string($data['redirect'] ?? null)
            && is_string($data['nonce'] ?? null)
            && is_int($data['issued_at'] ?? null)
            && $this->isAllowedAppRedirect($data['redirect']);

        return $valid ? [
            'id' => $data['id'],
            'redirect' => $data['redirect'],
            'nonce' => $data['nonce'],
            'terms' => (bool) ($data['terms'] ?? false),
            'issued_at' => $data['issued_at'],
        ] : null;
    }

    /**
     * Only the PocketPlan app may receive codes: its own scheme, plus Expo Go's
     * exp:// links outside production.
     */
    private function isAllowedAppRedirect(string $uri): bool
    {
        $scheme = strtolower((string) parse_url($uri, PHP_URL_SCHEME));
        $allowed = app()->environment('production') ? ['pocketplan'] : ['pocketplan', 'exp', 'exps'];

        return in_array($scheme, $allowed, true);
    }

    /**
     * @param  array<string, string>  $params
     */
    private function backToApp(string $appRedirect, array $params): RedirectResponse
    {
        $separator = str_contains($appRedirect, '?') ? '&' : '?';

        return redirect()->away($appRedirect.$separator.http_build_query($params));
    }

    private function page(string $message, int $status): Response
    {
        return response(
            '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>PocketPlan</title>'
            .'<body style="font-family:system-ui;padding:32px;color:#202534;background:#F7F8FC"><h2 style="color:#243B6B">PocketPlan</h2><p>'.e($message).'</p></body>',
            $status,
        );
    }
}
