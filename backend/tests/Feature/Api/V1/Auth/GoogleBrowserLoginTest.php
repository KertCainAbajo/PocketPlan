<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class GoogleBrowserLoginTest extends TestCase
{
    use RefreshDatabase;

    private const CLIENT_ID = 'pocketplan-web.apps.googleusercontent.com';

    private const APP_REDIRECT = 'exp://192.168.1.31:8081/--/oauth/google';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.google.client_ids' => [self::CLIENT_ID],
            'services.google.redirect_uri' => 'https://pocketplan.example.com/api/v1/auth/google/callback',
        ]);
    }

    /**
     * Start the flow and return [state, nonce] from the Google URL.
     *
     * @return array{string, string}
     */
    private function start(bool $terms = true): array
    {
        $location = $this->get('/api/v1/auth/google/redirect?'.http_build_query(['redirect_uri' => self::APP_REDIRECT, 'terms' => $terms ? 1 : 0]))
            ->assertRedirect()
            ->headers->get('Location');

        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', (string) $location);
        parse_str((string) parse_url((string) $location, PHP_URL_QUERY), $query);

        $this->assertSame(self::CLIENT_ID, $query['client_id']);
        $this->assertSame('id_token', $query['response_type']);
        $this->assertSame('form_post', $query['response_mode']);

        return [(string) $query['state'], (string) $query['nonce']];
    }

    private function fakeGoogle(string $nonce): void
    {
        Http::fake(['oauth2.googleapis.com/*' => Http::response([
            'aud' => self::CLIENT_ID,
            'iss' => 'https://accounts.google.com',
            'sub' => '1098765432101234567890',
            'email' => 'maria.santos@gmail.com',
            'email_verified' => 'true',
            'name' => 'Maria Santos',
            'nonce' => $nonce,
            'exp' => (string) (time() + 3600),
        ])]);
    }

    /** Query parameters of the URL the browser is sent back to. */
    private function appParams(TestResponse $response): array
    {
        $location = (string) $response->assertRedirect()->headers->get('Location');
        $this->assertStringStartsWith(self::APP_REDIRECT.'?', $location);
        parse_str((string) parse_url($location, PHP_URL_QUERY), $params);

        return $params;
    }

    public function test_full_flow_signs_a_new_student_in(): void
    {
        [$state, $nonce] = $this->start();
        $this->fakeGoogle($nonce);

        $params = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'id_token' => 'google-id-token']));
        $this->assertArrayHasKey('code', $params);

        $this->postJson('/api/v1/auth/google/exchange', ['code' => $params['code']])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'maria.santos@gmail.com')
            ->assertJsonStructure(['data' => ['token', 'expires_at']]);

        $this->assertNotNull(User::query()->sole()->terms_accepted_at);
    }

    public function test_code_works_only_once(): void
    {
        [$state, $nonce] = $this->start();
        $this->fakeGoogle($nonce);
        $code = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'id_token' => 't']))['code'];

        $this->postJson('/api/v1/auth/google/exchange', ['code' => $code])->assertOk();
        $this->postJson('/api/v1/auth/google/exchange', ['code' => $code])->assertJsonValidationErrors('code');
    }

    public function test_state_cannot_be_reused_or_forged(): void
    {
        [$state, $nonce] = $this->start();
        $this->fakeGoogle($nonce);

        $first = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'id_token' => 't']));
        $this->assertArrayHasKey('code', $first);

        // Android can deliver the same callback twice: the replay gets the same one-time code, never a second one,
        // and that code still works only once.
        $replay = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'id_token' => 't']));
        $this->assertSame($first['code'], $replay['code']);
        $this->postJson('/api/v1/auth/google/exchange', ['code' => $first['code']])->assertOk();
        $this->postJson('/api/v1/auth/google/exchange', ['code' => $replay['code']])->assertJsonValidationErrors('code');

        // A forged or tampered state is rejected outright.
        $this->post('/api/v1/auth/google/callback', ['state' => 'forged', 'id_token' => 't'])->assertStatus(400);
        $this->post('/api/v1/auth/google/callback', ['state' => $state.'x', 'id_token' => 't'])->assertStatus(400);
    }

    public function test_token_with_a_different_nonce_is_rejected(): void
    {
        [$state] = $this->start();
        $this->fakeGoogle('someone-elses-nonce');

        $params = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'id_token' => 't']));

        $this->assertArrayNotHasKey('code', $params);
        $this->assertArrayHasKey('error', $params);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_cancelling_at_google_returns_to_the_app(): void
    {
        [$state] = $this->start();

        $params = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'error' => 'access_denied']));

        $this->assertSame('cancelled', $params['error']);
    }

    public function test_admin_accounts_are_sent_back_with_an_error(): void
    {
        User::factory()->admin()->create(['email' => 'maria.santos@gmail.com']);
        [$state, $nonce] = $this->start();
        $this->fakeGoogle($nonce);

        $params = $this->appParams($this->post('/api/v1/auth/google/callback', ['state' => $state, 'id_token' => 't']));

        $this->assertSame('Admin accounts must sign in through the admin dashboard.', $params['error']);
    }

    public function test_only_app_links_may_receive_the_code(): void
    {
        $this->get('/api/v1/auth/google/redirect?redirect_uri='.urlencode('https://evil.example.com/steal'))->assertStatus(400);

        $this->get('/api/v1/auth/google/redirect?redirect_uri='.urlencode('pocketplan://oauth/google'))->assertRedirect();
    }

    public function test_reports_when_google_is_not_configured(): void
    {
        config(['services.google.redirect_uri' => null]);

        $location = (string) $this->get('/api/v1/auth/google/redirect?redirect_uri='.urlencode(self::APP_REDIRECT))
            ->assertRedirect()->headers->get('Location');

        $this->assertStringContainsString('error=Google+sign-in+is+not+configured', $location);
    }
}
