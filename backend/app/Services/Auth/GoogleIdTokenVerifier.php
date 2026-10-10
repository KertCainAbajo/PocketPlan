<?php

namespace App\Services\Auth;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

/**
 * Verifies a Google ID token with Google's tokeninfo endpoint and checks that
 * it was issued for this app, by Google, for a verified email address.
 */
class GoogleIdTokenVerifier
{
    private const TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    /**
     * @return array{sub: string, email: string, name: string, nonce: string|null}
     *
     * @throws ValidationException when the token is invalid or not for this app
     * @throws ServiceUnavailableHttpException when Google sign-in is not configured or Google is unreachable
     */
    public function verify(string $idToken): array
    {
        $clientIds = config('services.google.client_ids');
        if (empty($clientIds)) {
            throw new ServiceUnavailableHttpException(null, 'Google sign-in is not configured on this server.');
        }

        try {
            $response = Http::timeout(10)->get(self::TOKENINFO_URL, ['id_token' => $idToken]);
        } catch (ConnectionException) {
            throw new ServiceUnavailableHttpException(null, 'Could not reach Google. Please try again.');
        }

        $claims = $response->json();

        $valid = $response->ok()
            && is_array($claims)
            && in_array($claims['aud'] ?? null, $clientIds, true)
            && in_array($claims['iss'] ?? null, self::ISSUERS, true)
            && (int) ($claims['exp'] ?? 0) > time()
            && in_array($claims['email_verified'] ?? null, ['true', true], true)
            && ! empty($claims['sub'])
            && ! empty($claims['email']);

        if (! $valid) {
            throw ValidationException::withMessages(['id_token' => ['Google sign-in failed. Please try again.']]);
        }

        return [
            'sub' => (string) $claims['sub'],
            'email' => mb_strtolower((string) $claims['email']),
            'name' => (string) ($claims['name'] ?? explode('@', (string) $claims['email'])[0]),
            'nonce' => isset($claims['nonce']) ? (string) $claims['nonce'] : null,
        ];
    }
}
