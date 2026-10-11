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
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
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
    private const STATE_TTL_MINUTES = 10;

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

        // The state is an encrypted, tamper-proof envelope carrying where to send
        // the browser back. Its id is stored once, so each attempt works only once,
        // but even a stale or replayed attempt can still return the student to the app.
        $attemptId = Str::random(32);
        $nonce = Str::random(40);
        $state = Crypt::encryptString(json_encode([
            'id' => $attemptId,
            'redirect' => $appRedirect,
            'nonce' => $nonce,
            'terms' => $request->boolean('terms'),
        ], JSON_THROW_ON_ERROR));
        Cache::put("google-oauth:attempt:{$attemptId}", true, now()->addMinutes(self::STATE_TTL_MINUTES));

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

        // Used already (e.g. Android reopened an old browser tab) or older than 10 minutes.
        if (! Cache::pull("google-oauth:attempt:{$session['id']}")) {
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

        return $this->backToApp($appRedirect, ['code' => $code]);
    }

    /** Trade the one-time code for an API token. Each code works once, for two minutes. */
    public function exchange(Request $request, IssueMobileToken $issueToken): JsonResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:48'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        $userId = Cache::pull('google-oauth:code:'.$request->string('code'));
        $user = $userId ? User::query()->find($userId) : null;

        if (! $user) {
            throw ValidationException::withMessages(['code' => ['This sign-in has expired. Please try again.']]);
        }

        return (new AuthTokenResource($issueToken->handle($user, $request->input('device_name')), $user))->response();
    }

    /**
     * @return array{id: string, redirect: string, nonce: string, terms: bool}|null
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
            && $this->isAllowedAppRedirect($data['redirect']);

        return $valid ? [
            'id' => $data['id'],
            'redirect' => $data['redirect'],
            'nonce' => $data['nonce'],
            'terms' => (bool) ($data['terms'] ?? false),
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
