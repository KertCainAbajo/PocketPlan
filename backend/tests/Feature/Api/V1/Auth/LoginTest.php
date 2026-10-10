<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_log_in_with_case_insensitive_email(): void
    {
        $user = User::factory()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => ' Juan@Example.com', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonStructure(['data' => ['token', 'token_type', 'expires_at', 'user']]);

        $this->assertNotNull($user->fresh()?->last_login_at);
    }

    public function test_token_expires_after_the_configured_lifetime(): void
    {
        config(['pocketplan.token_ttl_days' => 30]);
        $user = User::factory()->create(['password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'secret123'])->assertOk();

        $expiresAt = $user->tokens()->sole()->expires_at;
        $this->assertNotNull($expiresAt);
        $this->assertTrue($expiresAt->between(now()->addDays(30)->subMinute(), now()->addDays(30)->addMinute()));
    }

    public function test_wrong_password_is_rejected(): void
    {
        User::factory()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'wrong-pass1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'These credentials do not match our records.']);
    }

    public function test_unknown_email_gets_the_same_error_as_a_wrong_password(): void
    {
        $this->postJson('/api/v1/login', ['email' => 'nobody@example.com', 'password' => 'secret123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'These credentials do not match our records.']);
    }

    public function test_admin_cannot_log_in_to_the_mobile_api(): void
    {
        User::factory()->admin()->create(['email' => 'admin@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'admin@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Admin accounts must sign in through the admin dashboard.')
            ->assertJsonMissingPath('data');
    }

    public function test_deactivated_student_cannot_log_in(): void
    {
        $user = User::factory()->deactivated()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated.');

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_login_is_rate_limited_per_email_and_ip(): void
    {
        User::factory()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'wrong-pass1'])
                ->assertUnprocessable();
        }

        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'secret123'])
            ->assertTooManyRequests();
    }
}
