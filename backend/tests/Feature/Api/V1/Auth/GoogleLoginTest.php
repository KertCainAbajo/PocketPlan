<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    private const CLIENT_ID = 'pocketplan-web.apps.googleusercontent.com';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_ids' => [self::CLIENT_ID]]);
    }

    /**
     * Make Google's tokeninfo endpoint return these claims.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function fakeGoogle(array $overrides = [], int $status = 200): void
    {
        Http::fake(['oauth2.googleapis.com/*' => Http::response(array_merge([
            'aud' => self::CLIENT_ID,
            'iss' => 'https://accounts.google.com',
            'sub' => '1098765432101234567890',
            'email' => 'Maria.Santos@gmail.com',
            'email_verified' => 'true',
            'name' => 'Maria Santos',
            'exp' => (string) (time() + 3600),
        ], $overrides), $status)]);
    }

    public function test_new_google_user_gets_a_student_account(): void
    {
        $this->fakeGoogle();

        $this->postJson('/api/v1/auth/google', ['id_token' => 'valid-token', 'terms' => true])
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'maria.santos@gmail.com')
            ->assertJsonPath('data.user.role', 'student')
            ->assertJsonStructure(['data' => ['token', 'expires_at']]);

        $user = User::query()->sole();
        $this->assertSame('1098765432101234567890', $user->google_id);
        $this->assertNotNull($user->terms_accepted_at);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNotNull($user->notificationPreference);
    }

    public function test_new_accounts_require_accepting_the_terms(): void
    {
        $this->fakeGoogle();

        $this->postJson('/api/v1/auth/google', ['id_token' => 'valid-token'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('terms');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_returning_google_user_signs_into_the_same_account(): void
    {
        $this->fakeGoogle();
        $existing = User::factory()->create(['google_id' => '1098765432101234567890', 'email' => 'old@example.com']);

        $this->postJson('/api/v1/auth/google', ['id_token' => 'valid-token'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $existing->id);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_existing_email_account_is_linked_to_google(): void
    {
        $this->fakeGoogle();
        $existing = User::factory()->create(['email' => 'maria.santos@gmail.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/auth/google', ['id_token' => 'valid-token'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $existing->id);

        $this->assertSame('1098765432101234567890', $existing->fresh()?->google_id);
        // The email/password login still works.
        $this->postJson('/api/v1/login', ['email' => 'maria.santos@gmail.com', 'password' => 'secret123'])->assertOk();
    }

    public function test_admins_and_deactivated_students_are_rejected(): void
    {
        $this->fakeGoogle();
        User::factory()->admin()->create(['email' => 'maria.santos@gmail.com']);

        $this->postJson('/api/v1/auth/google', ['id_token' => 'valid-token', 'terms' => true])
            ->assertForbidden()
            ->assertJsonPath('message', 'Admin accounts must sign in through the admin dashboard.');

        User::query()->delete();
        User::factory()->deactivated()->create(['email' => 'maria.santos@gmail.com']);

        $this->postJson('/api/v1/auth/google', ['id_token' => 'valid-token', 'terms' => true])
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated.');
    }

    /**
     * @return array<string, array{array<string, mixed>, int}>
     */
    public static function invalidTokens(): array
    {
        return [
            'token for another app' => [['aud' => 'someone-else.apps.googleusercontent.com'], 200],
            'not issued by Google' => [['iss' => 'https://evil.example.com'], 200],
            'unverified email' => [['email_verified' => 'false'], 200],
            'expired' => [['exp' => (string) (time() - 10)], 200],
            'rejected by Google' => [['error' => 'invalid_token'], 400],
        ];
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    #[DataProvider('invalidTokens')]
    public function test_invalid_tokens_are_rejected(array $claims, int $status): void
    {
        $this->fakeGoogle($claims, $status);

        $this->postJson('/api/v1/auth/google', ['id_token' => 'bad-token', 'terms' => true])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('id_token');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_returns_503_when_google_sign_in_is_not_configured(): void
    {
        config(['services.google.client_ids' => []]);
        Http::fake();

        $this->postJson('/api/v1/auth/google', ['id_token' => 'any', 'terms' => true])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Google sign-in is not configured on this server.');

        Http::assertNothingSent();
    }
}
