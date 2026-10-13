<?php

namespace Tests\Feature\Api\V1\Auth;

use App\Models\EmailLoginCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Expired sign-in codes are cleaned up by `model:prune`.
 */
class EmailCodePruneTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_codes_expired_for_over_a_day_are_pruned(): void
    {
        $old = EmailLoginCode::query()->create(['email' => 'old@example.com', 'code_hash' => 'x', 'expires_at' => now()->subDays(2)]);
        $fresh = EmailLoginCode::query()->create(['email' => 'new@example.com', 'code_hash' => 'x', 'expires_at' => now()->addMinutes(10)]);

        $this->artisan('model:prune', ['--model' => [EmailLoginCode::class]])->assertSuccessful();

        $this->assertModelMissing($old);
        $this->assertModelExists($fresh);
    }
}
