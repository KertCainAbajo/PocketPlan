<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function registerPayload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'device_name' => 'pixel-7',
        ], $overrides);
    }

    public function test_student_can_register_and_receives_token(): void
    {
        $response = $this->postJson('/api/v1/register', $this->registerPayload());

        $response->assertCreated()
            ->assertJsonPath('data.user.email', 'juan@example.com')
            ->assertJsonPath('data.user.role', 'student')
            ->assertJsonPath('data.user.is_onboarded', false)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email', 'currency', 'timezone']]]);

        $user = User::firstWhere('email', 'juan@example.com');
        $this->assertTrue($user->isStudent());
        $this->assertNotNull($user->notificationPreference);
        $this->assertNotSame('secret123', $user->password);
    }

    public function test_registration_ignores_client_supplied_role_and_status(): void
    {
        $this->postJson('/api/v1/register', $this->registerPayload([
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false,
        ]))->assertCreated()->assertJsonPath('data.user.role', 'student');

        $this->assertSame('student', User::firstWhere('email', 'juan@example.com')->role->value);
        $this->assertSame(0, User::where('role', 'admin')->count());
    }

    public function test_registration_validates_input(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/v1/register', $this->registerPayload([
            'email' => 'TAKEN@example.com',
            'password' => 'short',
            'password_confirmation' => 'different',
        ]))->assertUnprocessable()->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_student_can_log_in(): void
    {
        User::factory()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'Juan@Example.com', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user']]);
    }

    public function test_login_rejects_wrong_password(): void
    {
        User::factory()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'wrong-pass1'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_admin_cannot_log_in_to_mobile_api(): void
    {
        User::factory()->admin()->create(['email' => 'admin@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'admin@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonMissingPath('data.token');
    }

    public function test_deactivated_student_cannot_log_in(): void
    {
        User::factory()->deactivated()->create(['email' => 'juan@example.com', 'password' => 'secret123']);

        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'secret123'])
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated.');
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_me_returns_current_user(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonMissingPath('data.password');
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/logout')->assertNoContent();
        $this->assertSame(0, $user->tokens()->count());

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_deactivated_user_with_existing_token_is_blocked_and_token_revoked(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $user->forceFill(['status' => 'deactivated'])->save();

        $this->withToken($token)->getJson('/api/v1/me')->assertForbidden();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_admin_token_cannot_use_student_api(): void
    {
        $admin = User::factory()->admin()->create();
        $token = $admin->createToken('sneaky')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')->assertForbidden();
    }

    public function test_expired_token_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test', ['*'], now()->subMinute())->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_forgot_password_sends_link_to_students_only_with_identical_response(): void
    {
        Notification::fake();
        $student = User::factory()->create(['email' => 'juan@example.com']);
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);

        $expected = ['message' => 'If an account exists for that email, a password reset link has been sent.'];

        $this->postJson('/api/v1/forgot-password', ['email' => 'juan@example.com'])->assertOk()->assertExactJson($expected);
        $this->postJson('/api/v1/forgot-password', ['email' => 'nobody@example.com'])->assertOk()->assertExactJson($expected);
        $this->postJson('/api/v1/forgot-password', ['email' => 'admin@example.com'])->assertOk()->assertExactJson($expected);

        Notification::assertSentTo($student, ResetPassword::class, function (ResetPassword $n) use ($student) {
            return str_starts_with($n->toMail($student)->actionUrl, 'pocketplan://reset-password?token=');
        });
        Notification::assertNotSentTo($admin, ResetPassword::class);
    }

    public function test_reset_password_changes_password_and_revokes_tokens(): void
    {
        $user = User::factory()->create(['email' => 'juan@example.com']);
        $user->createToken('old-device');
        $token = Password::createToken($user);

        $this->postJson('/api/v1/reset-password', [
            'email' => 'juan@example.com',
            'token' => $token,
            'password' => 'newsecret456',
            'password_confirmation' => 'newsecret456',
        ])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'newsecret456'])->assertOk();
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        User::factory()->create(['email' => 'juan@example.com']);

        $this->postJson('/api/v1/reset-password', [
            'email' => 'juan@example.com',
            'token' => 'not-a-real-token',
            'password' => 'newsecret456',
            'password_confirmation' => 'newsecret456',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_login_is_rate_limited(): void
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
