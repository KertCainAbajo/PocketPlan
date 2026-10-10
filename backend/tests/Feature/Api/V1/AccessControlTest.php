<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Role and account-status enforcement shared by every protected student endpoint.
 */
class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_protected_endpoints_require_a_token(): void
    {
        $this->getJson('/api/v1/me')
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    public function test_api_returns_json_even_without_an_accept_header(): void
    {
        $this->get('/api/v1/me')->assertUnauthorized()->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_student_can_read_their_profile(): void
    {
        $user = User::factory()->create();

        $this->withToken($user->createToken('test')->plainTextToken)
            ->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');
    }

    public function test_admin_token_cannot_use_the_student_api(): void
    {
        $admin = User::factory()->admin()->create();

        $this->withToken($admin->createToken('sneaky')->plainTextToken)
            ->getJson('/api/v1/me')
            ->assertForbidden()
            ->assertJsonPath('message', 'This action is only available to student accounts.');
    }

    public function test_deactivated_student_is_blocked_and_every_device_is_signed_out(): void
    {
        $user = User::factory()->create();
        $phone = $user->createToken('phone')->plainTextToken;
        $user->createToken('tablet');
        $user->forceFill(['status' => 'deactivated'])->save();

        $this->withToken($phone)->getJson('/api/v1/me')
            ->assertForbidden()
            ->assertJsonPath('message', 'This account has been deactivated.');

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_expired_token_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('old', ['*'], now()->subMinute())->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_unknown_api_route_returns_a_generic_json_404(): void
    {
        $this->getJson('/api/v1/does-not-exist')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Resource not found.']);
    }
}
