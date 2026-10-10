<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_RESPONSE = ['message' => 'If an account exists for that email, a password reset link has been sent.'];

    public function test_reset_link_is_sent_to_active_students_as_a_deep_link(): void
    {
        Notification::fake();
        $student = User::factory()->create(['email' => 'juan@example.com']);

        $this->postJson('/api/v1/forgot-password', ['email' => 'Juan@Example.com'])
            ->assertOk()
            ->assertExactJson(self::GENERIC_RESPONSE);

        Notification::assertSentTo($student, ResetPassword::class, function (ResetPassword $notification) use ($student) {
            $url = $notification->toMail($student)->actionUrl;

            return str_starts_with($url, 'pocketplan://reset-password?token=')
                && str_contains($url, 'email=juan%40example.com');
        });
    }

    public function test_response_is_identical_for_unknown_admin_and_deactivated_accounts(): void
    {
        Notification::fake();
        $admin = User::factory()->admin()->create(['email' => 'admin@example.com']);
        $deactivated = User::factory()->deactivated()->create(['email' => 'gone@example.com']);

        foreach (['nobody@example.com', 'admin@example.com', 'gone@example.com'] as $email) {
            $this->postJson('/api/v1/forgot-password', ['email' => $email])
                ->assertOk()
                ->assertExactJson(self::GENERIC_RESPONSE);
        }

        Notification::assertNotSentTo([$admin, $deactivated], ResetPassword::class);
    }

    public function test_reset_changes_the_password_and_signs_out_every_device(): void
    {
        $user = User::factory()->create(['email' => 'juan@example.com']);
        $user->createToken('phone');
        $user->createToken('tablet');

        $this->postJson('/api/v1/reset-password', [
            'email' => 'juan@example.com',
            'token' => Password::createToken($user),
            'password' => 'newsecret456',
            'password_confirmation' => 'newsecret456',
        ])->assertOk();

        $this->assertSame(0, $user->tokens()->count());
        $this->postJson('/api/v1/login', ['email' => 'juan@example.com', 'password' => 'newsecret456'])->assertOk();
    }

    public function test_invalid_token_is_rejected(): void
    {
        User::factory()->create(['email' => 'juan@example.com']);

        $this->postJson('/api/v1/reset-password', [
            'email' => 'juan@example.com',
            'token' => 'not-a-real-token',
            'password' => 'newsecret456',
            'password_confirmation' => 'newsecret456',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_new_password_must_be_confirmed(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/reset-password', [
            'email' => $user->email,
            'token' => Password::createToken($user),
            'password' => 'newsecret456',
            'password_confirmation' => 'mismatch456',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }
}
