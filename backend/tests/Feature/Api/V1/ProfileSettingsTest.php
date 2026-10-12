<?php

namespace Tests\Feature\Api\V1;

use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Profile & settings endpoints: timezone, account management and account deletion.
 */
class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_change_their_timezone(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $user->email, 'currency' => 'PHP', 'timezone' => 'Asia/Tokyo'])
            ->assertOk()
            ->assertJsonPath('data.timezone', 'Asia/Tokyo');
    }

    public function test_invalid_timezone_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->patchJson('/api/v1/me', ['name' => $user->name, 'email' => $user->email, 'currency' => 'PHP', 'timezone' => 'Mars/Olympus'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('timezone');
    }

    public function test_student_can_rename_an_account_and_keep_its_name(): void
    {
        $user = User::factory()->create();
        $account = $user->accounts()->create(['name' => 'GCash', 'type' => 'wallet']);

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/v1/accounts/{$account->id}", ['name' => 'GCash', 'type' => 'bank'])
            ->assertOk()
            ->assertJsonPath('data.type', 'bank');

        $this->actingAs($user, 'sanctum')
            ->patchJson("/api/v1/accounts/{$account->id}", ['name' => 'Maya', 'type' => 'wallet'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Maya');
    }

    public function test_student_cannot_edit_someone_elses_account(): void
    {
        $other = User::factory()->create()->accounts()->create(['name' => 'Theirs', 'type' => 'cash']);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->patchJson("/api/v1/accounts/{$other->id}", ['name' => 'Mine', 'type' => 'cash'])
            ->assertNotFound();
    }

    public function test_deleting_an_account_moves_its_transactions_to_the_default_account(): void
    {
        $user = User::factory()->create();
        $default = $user->ensureDefaultAccount();
        $wallet = $user->accounts()->create(['name' => 'GCash', 'type' => 'wallet']);
        $expense = Expense::factory()->for($user)->create(['account_id' => $wallet->id]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/accounts/{$wallet->id}")
            ->assertNoContent();

        $this->assertModelMissing($wallet);
        $this->assertSame($default->id, $expense->refresh()->account_id);
    }

    public function test_default_account_cannot_be_deleted(): void
    {
        $user = User::factory()->create();
        $default = $user->ensureDefaultAccount();

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/accounts/{$default->id}")
            ->assertStatus(409);
    }

    public function test_deleting_the_profile_requires_the_password(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/v1/me', ['current_password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->assertModelExists($user);
    }

    public function test_student_can_delete_their_profile_and_data(): void
    {
        $user = User::factory()->create();
        $category = Category::factory()->create(['user_id' => $user->id]);
        $expense = Expense::factory()->for($user)->create(['category_id' => $category->id]);
        $user->ensureDefaultAccount();
        $token = $user->createToken('phone')->plainTextToken;

        $this->withToken($token)
            ->deleteJson('/api/v1/me', ['current_password' => 'password'])
            ->assertNoContent();

        $this->assertModelMissing($user);
        $this->assertModelMissing($expense);
        $this->assertModelMissing($category);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
