<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CategoryType;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use InteractsWithStudents, RefreshDatabase;

    private User $student;

    private Budget $budget;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCategories();
        $this->freezeToday();
        $this->student = $this->actingAsStudent();
        // Oct 5 – Oct 11.
        $this->budget = Budget::factory()->for($this->student)->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'category_id' => $this->defaultCategory('Food')->id,
            'amount' => '120.50',
            'description' => 'Lunch',
            'payment_method' => 'gcash',
            'spent_on' => self::TODAY,
        ], $overrides);
    }

    public function test_expense_is_assigned_to_the_budget_covering_its_date(): void
    {
        $this->postJson('/api/v1/expenses', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.amount', '120.50')
            ->assertJsonPath('data.budget_id', $this->budget->id)
            ->assertJsonPath('data.category.name', 'Food')
            ->assertJsonPath('data.payment_method', 'gcash');

        $this->postJson('/api/v1/expenses', $this->payload(['spent_on' => '2026-10-01']))
            ->assertCreated()
            ->assertJsonPath('data.budget_id', null);
    }

    public function test_client_cannot_choose_the_budget_or_owner(): void
    {
        $other = User::factory()->create();
        $otherBudget = Budget::factory()->for($other)->create();

        $response = $this->postJson('/api/v1/expenses', $this->payload(['budget_id' => $otherBudget->id, 'user_id' => $other->id]))
            ->assertCreated();

        $expense = Expense::query()->findOrFail($response->json('data.id'));
        $this->assertSame($this->student->id, $expense->user_id);
        $this->assertSame($this->budget->id, $expense->budget_id);
    }

    public function test_future_dates_are_rejected_using_the_students_timezone(): void
    {
        // 23:30 UTC on Oct 7 is already Oct 8 in Manila, so Oct 8 is "today" and allowed.
        $this->travelTo(CarbonImmutable::parse('2026-10-07 23:30:00', 'UTC'));

        $this->postJson('/api/v1/expenses', $this->payload(['spent_on' => '2026-10-08']))->assertCreated();
        $this->postJson('/api/v1/expenses', $this->payload(['spent_on' => '2026-10-09']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['spent_on' => 'Expenses cannot be dated in the future.']);
    }

    public function test_validation(): void
    {
        $income = $this->defaultCategory('Allowance', CategoryType::Income);
        $foreign = Category::factory()->forUser(User::factory()->create())->create();

        $this->postJson('/api/v1/expenses', $this->payload(['category_id' => $income->id]))->assertJsonValidationErrors('category_id');
        $this->postJson('/api/v1/expenses', $this->payload(['category_id' => $foreign->id]))->assertJsonValidationErrors('category_id');
        $this->postJson('/api/v1/expenses', $this->payload(['amount' => '0']))->assertJsonValidationErrors('amount');
        $this->postJson('/api/v1/expenses', $this->payload(['amount' => '10.555']))->assertJsonValidationErrors('amount');
        $this->postJson('/api/v1/expenses', $this->payload(['payment_method' => 'bitcoin']))->assertJsonValidationErrors('payment_method');
        $this->postJson('/api/v1/expenses', [])->assertJsonValidationErrors(['category_id', 'amount', 'description', 'spent_on']);
    }

    public function test_deactivated_category_cannot_be_chosen_but_existing_expenses_keep_it(): void
    {
        $shopping = $this->defaultCategory('Shopping');
        $expense = Expense::factory()->for($this->student)->create(['category_id' => $shopping->id]);
        $shopping->update(['is_active' => false]);

        $this->postJson('/api/v1/expenses', $this->payload(['category_id' => $shopping->id]))
            ->assertJsonValidationErrors('category_id');

        $this->putJson("/api/v1/expenses/{$expense->id}", $this->payload(['category_id' => $shopping->id, 'amount' => '99.00']))
            ->assertOk()
            ->assertJsonPath('data.amount', '99.00');
    }

    public function test_changing_the_date_moves_the_expense_to_the_right_budget(): void
    {
        $expense = Expense::factory()->for($this->student)->create(['spent_on' => self::TODAY, 'budget_id' => $this->budget->id]);

        $this->putJson("/api/v1/expenses/{$expense->id}", $this->payload(['spent_on' => '2026-10-01']))
            ->assertOk()
            ->assertJsonPath('data.budget_id', null);
    }

    public function test_show_update_and_delete_own_expense(): void
    {
        $expense = Expense::factory()->for($this->student)->create();

        $this->getJson("/api/v1/expenses/{$expense->id}")->assertOk()->assertJsonPath('data.id', $expense->id);
        $this->deleteJson("/api/v1/expenses/{$expense->id}")->assertNoContent();
        $this->assertModelMissing($expense);
    }

    public function test_another_students_expense_is_invisible(): void
    {
        $foreign = Expense::factory()->create();

        $this->getJson("/api/v1/expenses/{$foreign->id}")->assertNotFound()->assertExactJson(['message' => 'Resource not found.']);
        $this->putJson("/api/v1/expenses/{$foreign->id}", $this->payload())->assertNotFound();
        $this->deleteJson("/api/v1/expenses/{$foreign->id}")->assertNotFound();
        $this->assertModelExists($foreign);
        $this->getJson('/api/v1/expenses')->assertJsonCount(0, 'data');
    }

    public function test_history_search_filters_sorting_and_total(): void
    {
        $food = $this->defaultCategory('Food');
        $transport = $this->defaultCategory('Transportation');
        Expense::factory()->for($this->student)->create(['category_id' => $food->id, 'description' => 'Jollibee lunch', 'amount' => '150.00', 'spent_on' => '2026-10-05']);
        Expense::factory()->for($this->student)->create(['category_id' => $food->id, 'description' => 'Milk tea', 'amount' => '95.00', 'spent_on' => '2026-10-06']);
        Expense::factory()->for($this->student)->create(['category_id' => $transport->id, 'description' => 'Jeepney', 'amount' => '13.00', 'spent_on' => '2026-10-07']);

        $this->getJson('/api/v1/expenses')
            ->assertJsonPath('data.0.description', 'Jeepney')
            ->assertJsonPath('meta.total_amount', '258.00')
            ->assertJsonPath('meta.total', 3);

        $this->getJson('/api/v1/expenses?sort=oldest')->assertJsonPath('data.0.description', 'Jollibee lunch');
        $this->getJson("/api/v1/expenses?category_id={$food->id}")->assertJsonCount(2, 'data')->assertJsonPath('meta.total_amount', '245.00');
        $this->getJson('/api/v1/expenses?search=jolli')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/expenses?from=2026-10-06&to=2026-10-06')->assertJsonCount(1, 'data')->assertJsonPath('data.0.description', 'Milk tea');
        $this->getJson('/api/v1/expenses?per_page=2')->assertJsonCount(2, 'data')->assertJsonPath('meta.last_page', 2);
        $this->getJson('/api/v1/expenses?search=%25')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/expenses?from=2026-10-07&to=2026-10-01')->assertJsonValidationErrors('to');
    }
}
