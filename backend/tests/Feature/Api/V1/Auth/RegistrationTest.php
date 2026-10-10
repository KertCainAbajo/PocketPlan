<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
            'device_name' => 'pixel-7',
        ], $overrides);
    }

    public function test_student_can_register_and_receives_a_token(): void
    {
        $this->postJson('/api/v1/register', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.email', 'juan@example.com')
            ->assertJsonPath('data.user.role', 'student')
            ->assertJsonPath('data.user.is_onboarded', false)
            ->assertJsonStructure(['data' => ['token', 'expires_at', 'user' => ['id', 'name', 'email', 'currency', 'timezone']]]);

        $user = User::query()->where('email', 'juan@example.com')->firstOrFail();
        $this->assertTrue($user->isStudent());
        $this->assertNotNull($user->notificationPreference);
        $this->assertNotSame('secret123', $user->password);
        $this->assertSame('mobile:pixel-7', $user->tokens()->sole()->name);
    }

    public function test_client_cannot_choose_role_or_status(): void
    {
        $this->postJson('/api/v1/register', $this->payload([
            'role' => 'admin',
            'status' => 'active',
            'must_change_password' => false,
        ]))->assertCreated()->assertJsonPath('data.user.role', 'student');

        $this->assertSame(0, User::query()->where('role', UserRole::Admin)->count());
    }

    public function test_email_is_normalised_before_the_uniqueness_check(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->postJson('/api/v1/register', $this->payload(['email' => '  TAKEN@Example.com ']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_password_rules_are_enforced(): void
    {
        $this->postJson('/api/v1/register', $this->payload([
            'password' => 'short',
            'password_confirmation' => 'different',
        ]))->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson('/api/v1/register', $this->payload([
            'password' => 'onlyletters',
            'password_confirmation' => 'onlyletters',
        ]))->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_required_fields(): void
    {
        $this->postJson('/api/v1/register', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }
}
