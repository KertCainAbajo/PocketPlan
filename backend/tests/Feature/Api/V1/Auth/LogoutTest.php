<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_logout_revokes_only_the_current_device_token(): void
    {
        $user = User::factory()->create();
        $phone = $user->createToken('phone')->plainTextToken;
        $user->createToken('tablet');

        $this->withToken($phone)->postJson('/api/v1/logout')->assertNoContent();

        $this->assertSame(['tablet'], $user->tokens()->pluck('name')->all());

        $this->app['auth']->forgetGuards();
        $this->withToken($phone)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/v1/logout')->assertUnauthorized();
    }
}
