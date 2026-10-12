<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CategoryType;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The optional time of day on expenses and incomes.
 */
class TransactionTimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_expense_can_be_saved_with_a_time(): void
    {
        $user = User::factory()->create();
        $category = Category::factory()->create(['user_id' => $user->id, 'type' => CategoryType::Expense]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/expenses', [
                'category_id' => $category->id,
                'amount' => '85.00',
                'description' => 'Lunch',
                'spent_on' => now($user->timezone)->toDateString(),
                'spent_time' => '12:30',
            ])
            ->assertCreated()
            ->assertJsonPath('data.spent_time', '12:30');
    }

    public function test_income_time_is_optional_and_validated(): void
    {
        $user = User::factory()->create();
        $category = Category::factory()->create(['user_id' => $user->id, 'type' => CategoryType::Income]);
        $input = ['category_id' => $category->id, 'amount' => '500.00', 'description' => 'Allowance', 'received_on' => now($user->timezone)->toDateString()];

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/incomes', $input)
            ->assertCreated()
            ->assertJsonPath('data.received_time', null);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/incomes', [...$input, 'received_time' => '25:99'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('received_time');
    }
}
