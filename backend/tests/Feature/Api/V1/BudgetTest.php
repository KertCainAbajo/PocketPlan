<?php

namespace Tests\Feature\Api\V1;

use App\Models\Budget;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class BudgetTest extends TestCase
{
    use InteractsWithStudents, RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCategories();
        $this->freezeToday();
        $this->student = $this->actingAsStudent();
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Week 41',
            'spending_limit' => '2000',
            'frequency' => 'weekly',
            'start_date' => '2026-10-05',
        ], $overrides);
    }

    public function test_end_date_is_derived_from_the_frequency(): void
    {
        $this->postJson('/api/v1/budgets', $this->payload())->assertCreated()->assertJsonPath('data.end_date', '2026-10-11');
        $this->postJson('/api/v1/budgets', $this->payload(['frequency' => 'monthly', 'start_date' => '2026-11-01']))
            ->assertCreated()->assertJsonPath('data.end_date', '2026-11-30');
        $this->postJson('/api/v1/budgets', $this->payload(['frequency' => 'daily', 'start_date' => '2026-12-01']))
            ->assertCreated()->assertJsonPath('data.end_date', '2026-12-01');
    }

    public function test_custom_budget_requires_an_end_date(): void
    {
        $this->postJson('/api/v1/budgets', $this->payload(['frequency' => 'custom']))->assertJsonValidationErrors('end_date');
        $this->postJson('/api/v1/budgets', $this->payload(['frequency' => 'custom', 'end_date' => '2026-10-20']))
            ->assertCreated()->assertJsonPath('data.summary.total_days', 16);
    }

    public function test_spec_example_summary(): void
    {
        $budget = Budget::factory()->for($this->student)->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11', 'spending_limit' => '2000.00']);
        Expense::factory()->for($this->student)->create(['budget_id' => $budget->id, 'amount' => '650.00', 'spent_on' => '2026-10-06']);

        $this->getJson("/api/v1/budgets/{$budget->id}")
            ->assertOk()
            ->assertJsonPath('data.summary.state', 'active')
            ->assertJsonPath('data.summary.remaining', '1350.00')
            ->assertJsonPath('data.summary.days_remaining', 5)
            ->assertJsonPath('data.summary.daily_target', '270.00')
            ->assertJsonPath('data.summary.status_label', 'Safe');
    }

    public function test_overlapping_budgets_are_rejected_but_adjacent_ones_are_fine(): void
    {
        $this->postJson('/api/v1/budgets', $this->payload())->assertCreated();

        $this->postJson('/api/v1/budgets', $this->payload(['start_date' => '2026-10-11']))
            ->assertStatus(409)
            ->assertJsonPath('message', 'These dates overlap your budget "Week 41" (2026-10-05 to 2026-10-11).');

        $this->postJson('/api/v1/budgets', $this->payload(['start_date' => '2026-10-12']))->assertCreated();
    }

    public function test_other_students_budgets_do_not_count_as_overlaps(): void
    {
        Budget::factory()->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11']);

        $this->postJson('/api/v1/budgets', $this->payload())->assertCreated();
    }

    public function test_new_budget_adopts_unbudgeted_expenses_in_its_period(): void
    {
        $inside = Expense::factory()->for($this->student)->create(['spent_on' => '2026-10-06']);
        $outside = Expense::factory()->for($this->student)->create(['spent_on' => '2026-10-01']);

        $id = $this->postJson('/api/v1/budgets', $this->payload())->json('data.id');

        $this->assertSame($id, $inside->fresh()?->budget_id);
        $this->assertNull($outside->fresh()?->budget_id);
    }

    public function test_shrinking_a_budget_releases_expenses_outside_the_new_dates(): void
    {
        $id = $this->postJson('/api/v1/budgets', $this->payload())->json('data.id');
        $early = Expense::factory()->for($this->student)->create(['spent_on' => '2026-10-05', 'budget_id' => $id]);

        $this->putJson("/api/v1/budgets/{$id}", $this->payload(['frequency' => 'custom', 'start_date' => '2026-10-06', 'end_date' => '2026-10-11']))
            ->assertOk();

        $this->assertNull($early->fresh()?->budget_id);
    }

    public function test_completing_early_lets_a_new_budget_start_the_next_day(): void
    {
        $id = $this->postJson('/api/v1/budgets', $this->payload())->json('data.id');
        $today = Expense::factory()->for($this->student)->create(['spent_on' => self::TODAY, 'budget_id' => $id]);

        $this->postJson("/api/v1/budgets/{$id}/complete", ['end_date' => '2026-10-06'])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.end_date', '2026-10-06')
            ->assertJsonPath('data.summary.state', 'completed');

        $this->assertNull($today->fresh()?->budget_id);

        $newId = $this->postJson('/api/v1/budgets', $this->payload(['start_date' => self::TODAY]))->assertCreated()->json('data.id');
        $this->assertSame($newId, $today->fresh()?->budget_id);
    }

    public function test_completed_budgets_cannot_be_edited_or_completed_again(): void
    {
        $budget = Budget::factory()->for($this->student)->completed()->create();

        $this->putJson("/api/v1/budgets/{$budget->id}", $this->payload())->assertStatus(409);
        $this->postJson("/api/v1/budgets/{$budget->id}/complete")->assertStatus(409);
    }

    public function test_complete_end_date_must_be_within_the_budget_and_not_in_the_future(): void
    {
        $id = $this->postJson('/api/v1/budgets', $this->payload())->json('data.id');

        $this->postJson("/api/v1/budgets/{$id}/complete", ['end_date' => '2026-10-09'])->assertJsonValidationErrors('end_date');
        $this->postJson("/api/v1/budgets/{$id}/complete", ['end_date' => '2026-10-04'])->assertJsonValidationErrors('end_date');
    }

    public function test_upcoming_budget_cannot_be_completed(): void
    {
        $id = $this->postJson('/api/v1/budgets', $this->payload(['start_date' => '2026-11-01']))->json('data.id');

        $this->postJson("/api/v1/budgets/{$id}/complete")->assertStatus(409);
    }

    public function test_category_limits_report_spending_and_status(): void
    {
        $food = $this->defaultCategory('Food');
        $fun = $this->defaultCategory('Entertainment');

        $id = $this->postJson('/api/v1/budgets', $this->payload(['category_limits' => [
            ['category_id' => $food->id, 'limit_amount' => '1000'],
            ['category_id' => $fun->id, 'limit_amount' => '200'],
        ]]))->assertCreated()->json('data.id');

        Expense::factory()->for($this->student)->create(['budget_id' => $id, 'category_id' => $food->id, 'amount' => '850.00', 'spent_on' => '2026-10-06']);
        Expense::factory()->for($this->student)->create(['budget_id' => $id, 'category_id' => $fun->id, 'amount' => '250.00', 'spent_on' => '2026-10-06']);

        $limits = collect($this->getJson("/api/v1/budgets/{$id}")->assertOk()->json('data.category_limits'))->keyBy('category_id');

        $this->assertSame('watch', $limits[$food->id]['status']);
        $this->assertSame('150.00', $limits[$food->id]['remaining']);
        $this->assertSame(85, $limits[$food->id]['percent_used']);
        $this->assertSame('over', $limits[$fun->id]['status']);
        $this->assertSame('-50.00', $limits[$fun->id]['remaining']);
    }

    public function test_category_limit_validation(): void
    {
        $food = $this->defaultCategory('Food')->id;

        $this->postJson('/api/v1/budgets', $this->payload(['category_limits' => [['category_id' => $food, 'limit_amount' => '2500']]]))
            ->assertJsonValidationErrors(['category_limits.0.limit_amount' => 'A category limit cannot be larger than the whole budget.']);

        $this->postJson('/api/v1/budgets', $this->payload(['category_limits' => [
            ['category_id' => $food, 'limit_amount' => '100'],
            ['category_id' => $food, 'limit_amount' => '200'],
        ]]))->assertJsonValidationErrors('category_limits.1.category_id');
    }

    public function test_category_limits_cannot_add_up_to_more_than_the_budget(): void
    {
        $food = $this->defaultCategory('Food')->id;
        $transport = $this->defaultCategory('Transportation')->id;

        $this->postJson('/api/v1/budgets', $this->payload(['category_limits' => [
            ['category_id' => $food, 'limit_amount' => '1500'],
            ['category_id' => $transport, 'limit_amount' => '500.01'],
        ]]))->assertJsonValidationErrors('category_limits');

        $this->postJson('/api/v1/budgets', $this->payload(['category_limits' => [
            ['category_id' => $food, 'limit_amount' => '1500'],
            ['category_id' => $transport, 'limit_amount' => '500'],
        ]]))->assertCreated();
    }

    public function test_amount_can_be_changed_without_resending_categories(): void
    {
        $food = $this->defaultCategory('Food')->id;
        $id = $this->postJson('/api/v1/budgets', $this->payload(['category_limits' => [['category_id' => $food, 'limit_amount' => '800']]]))->json('data.id');

        $this->putJson("/api/v1/budgets/{$id}", $this->payload(['spending_limit' => '799.99']))
            ->assertJsonValidationErrors('spending_limit');

        $this->putJson("/api/v1/budgets/{$id}", $this->payload(['spending_limit' => '1500', 'frequency' => 'monthly']))
            ->assertOk()
            ->assertJsonPath('data.spending_limit', '1500.00')
            ->assertJsonPath('data.end_date', '2026-11-04')
            ->assertJsonCount(1, 'data.category_limits');

        $this->putJson("/api/v1/budgets/{$id}", $this->payload(['spending_limit' => '500', 'category_limits' => []]))
            ->assertOk()
            ->assertJsonCount(0, 'data.category_limits');
    }

    public function test_list_filter_and_privacy(): void
    {
        Budget::factory()->for($this->student)->completed()->create(['start_date' => '2026-09-01', 'end_date' => '2026-09-30']);
        Budget::factory()->for($this->student)->create();
        $foreign = Budget::factory()->create();

        $this->getJson('/api/v1/budgets')->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/budgets?status=completed')->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/budgets/{$foreign->id}")->assertNotFound();
        $this->putJson("/api/v1/budgets/{$foreign->id}", $this->payload())->assertNotFound();
        $this->postJson("/api/v1/budgets/{$foreign->id}/complete")->assertNotFound();
    }
}
