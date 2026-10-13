<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\EmailLoginCode;
use App\Models\User;
use App\Notifications\EmailLoginCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Passwordless sign-in and sign-up with an emailed 6-digit code.
 */
class EmailCodeTest extends TestCase
{
    use RefreshDatabase;

    /** Requests a code and returns it, read from the faked email. */
    private function requestCode(string $email): string
    {
        Notification::fake();
        $this->postJson('/api/v1/auth/email-code', ['email' => $email])->assertOk();

        $code = '';
        Notification::assertSentTo(new AnonymousNotifiable, EmailLoginCodeNotification::class, function (EmailLoginCodeNotification $notification, array $channels, AnonymousNotifiable $notifiable) use (&$code, $email) {
            $code = $notification->code();

            return $notifiable->routes['mail'] === mb_strtolower(trim($email));
        });

        return $code;
    }

    public function test_a_code_is_emailed_and_only_its_hash_is_stored(): void
    {
        $code = $this->requestCode('juan@example.com');

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $record = EmailLoginCode::query()->sole();
        $this->assertNotSame($code, $record->code_hash);
    }

    public function test_existing_student_signs_in_with_the_code(): void
    {
        $user = User::factory()->create(['email' => 'juan@example.com']);
        $code = $this->requestCode('Juan@Example.com ');

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.user.id', $user->id)
            ->assertJsonStructure(['data' => ['token', 'user']]);

        // A code works only once.
        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $code])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_new_email_asks_for_a_name_then_creates_the_account(): void
    {
        $code = $this->requestCode('new@example.com');

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'new@example.com', 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.needs_name', true);
        $this->assertDatabaseMissing('users', ['email' => 'new@example.com']);

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'new@example.com', 'code' => $code, 'name' => 'Maria Santos'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('terms');

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'new@example.com', 'code' => $code, 'name' => 'Maria Santos', 'terms' => true])
            ->assertCreated()
            ->assertJsonPath('data.user.name', 'Maria Santos');
        $this->assertNotNull(User::query()->where('email', 'new@example.com')->sole()->email_verified_at);
    }

    public function test_wrong_codes_are_counted_and_lock_the_code(): void
    {
        // The per-minute auth throttle would stop this many requests first.
        $this->withoutMiddleware(ThrottleRequests::class);
        User::factory()->create(['email' => 'juan@example.com']);
        $code = $this->requestCode('juan@example.com');
        $wrong = $code === '000000' ? '111111' : '000000';

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $wrong])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'That code is not right. 4 tries left.']);

        foreach (range(1, 4) as $_) {
            $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $wrong]);
        }

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $code])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['code' => 'This code has expired. Request a new one.']);
    }

    public function test_expired_code_is_rejected(): void
    {
        User::factory()->create(['email' => 'juan@example.com']);
        $code = $this->requestCode('juan@example.com');
        $this->travel(11)->minutes();

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $code])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');
    }

    public function test_a_new_code_cannot_be_requested_straight_away(): void
    {
        $this->requestCode('juan@example.com');

        $this->postJson('/api/v1/auth/email-code', ['email' => 'juan@example.com'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->travel(61)->seconds();
        $this->postJson('/api/v1/auth/email-code', ['email' => 'juan@example.com'])->assertOk();
    }

    public function test_deactivated_student_cannot_sign_in_with_a_code(): void
    {
        User::factory()->deactivated()->create(['email' => 'juan@example.com']);
        $code = $this->requestCode('juan@example.com');

        $this->postJson('/api/v1/auth/email-code/verify', ['email' => 'juan@example.com', 'code' => $code])
            ->assertForbidden();
    }

    public function test_sign_in_needs_an_existing_account(): void
    {
        Notification::fake();

        $this->postJson('/api/v1/auth/email-code', ['email' => 'nobody@example.com', 'intent' => 'signin'])
            ->assertUnprocessable()
            ->assertJsonPath('reason', 'no_account');

        Notification::assertNothingSent();
    }

    public function test_sign_up_refuses_an_email_that_already_has_an_account(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'juan@example.com']);

        $this->postJson('/api/v1/auth/email-code', ['email' => 'Juan@Example.com', 'intent' => 'signup'])
            ->assertUnprocessable()
            ->assertJsonPath('reason', 'account_exists');

        Notification::assertNothingSent();
    }

    public function test_matching_intent_sends_the_code(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'juan@example.com']);

        $this->postJson('/api/v1/auth/email-code', ['email' => 'juan@example.com', 'intent' => 'signin'])->assertOk();
        $this->postJson('/api/v1/auth/email-code', ['email' => 'new@example.com', 'intent' => 'signup'])->assertOk();
    }
}
