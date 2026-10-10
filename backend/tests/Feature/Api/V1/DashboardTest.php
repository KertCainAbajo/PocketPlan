<?php

namespace Tests\Feature\Api\V1;

use App\Enums\CategoryType;
use App\Models\Budget;
use App\Models\Expense;
use App\Models\Income;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use InteractsWithStudents, RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCategories();
        $this->freezeToday();
        $this->student = $this->actingAsStudent(['name' => 'Juan Dela Cruz']);
    }

    private function spend(string $amount, string $date, string $category = 'Food', ?Budget $budget = null): Expense
    {
        return Expense::factory()->for($this->student)->create([
            'amount' => $amount,
            'spent_on' => $date,
            'category_id' => $this->defaultCategory($category)->id,
            'budget_id' => $budget?->id,
        ]);
    }

    public function test_spec_scenario(): void
    {
        Income::factory()->for($this->student)->create([
            'amount' => '2000.00', 'received_on' => '2026-10-05',
            'category_id' => $this->defaultCategory('Allowance', CategoryType::Income)->id,
        ]);
        $budget = Budget::factory()->for($this->student)->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11']);
        $this->spend('400.00', '2026-10-05', 'Food', $budget);
        $this->spend('250.00', '2026-10-06', 'Transportation', $budget);
        $this->spend('120.00', self::TODAY, 'Food', $budget);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.greeting_name', 'Juan')
            ->assertJsonPath('data.available_balance', '1230.00')
            ->assertJsonPath('data.today_spending', '120.00')
            ->assertJsonPath('data.this_month.income', '2000.00')
            ->assertJsonPath('data.this_month.expenses', '770.00')
            ->assertJsonPath('data.budget.summary.remaining', '1230.00')
            ->assertJsonPath('data.budget.summary.days_remaining', 5)
            ->assertJsonPath('data.budget.summary.daily_target', '270.00')
            ->assertJsonPath('data.budget.summary.today_remaining', '150.00')
            ->assertJsonPath('data.budget.summary.status', 'safe')
            ->assertJsonPath('data.budget.summary.limited_by', 'budget')
            ->assertJsonPath('data.category_breakdown.0.name', 'Food')
            ->assertJsonPath('data.category_breakdown.0.total', '520.00')
            ->assertJsonPath('data.category_breakdown.0.percent', 67)
            ->assertJsonPath('data.recent_transactions.0.type', 'expense')
            ->assertJsonPath('data.recent_transactions.0.amount', '120.00')
            ->assertJsonCount(4, 'data.recent_transactions');
    }

    public function test_recommendation_is_capped_by_money_actually_on_hand(): void
    {
        Income::factory()->for($this->student)->create(['amount' => '500.00', 'received_on' => '2026-10-05']);
        $budget = Budget::factory()->for($this->student)->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11']);
        $this->spend('100.00', '2026-10-05', 'Food', $budget);

        // Budget alone would allow (2000 − 100) ÷ 5 = 380/day; only ₱400 is on hand → 80/day.
        $this->getJson('/api/v1/dashboard')
            ->assertJsonPath('data.available_balance', '400.00')
            ->assertJsonPath('data.budget.summary.daily_target', '80.00')
            ->assertJsonPath('data.budget.summary.limited_by', 'balance');
    }

    public function test_students_who_do_not_record_income_get_the_plain_budget_target(): void
    {
        $budget = Budget::factory()->for($this->student)->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11']);
        $this->spend('650.00', '2026-10-06', 'Food', $budget);

        $this->getJson('/api/v1/dashboard')
            ->assertJsonPath('data.budget.summary.daily_target', '270.00')
            ->assertJsonPath('data.budget.summary.limited_by', 'budget');
    }

    public function test_without_a_budget_the_dashboard_still_shows_balances(): void
    {
        Income::factory()->for($this->student)->create(['amount' => '1000.00', 'received_on' => self::TODAY]);
        $this->spend('50.00', self::TODAY);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.budget', null)
            ->assertJsonPath('data.available_balance', '950.00')
            ->assertJsonPath('data.category_breakdown', []);
    }

    public function test_completed_budget_is_not_shown_as_current(): void
    {
        Budget::factory()->for($this->student)->completed()->create(['start_date' => '2026-10-05', 'end_date' => '2026-10-11']);

        $this->getJson('/api/v1/dashboard')->assertJsonPath('data.budget', null);
    }

    public function test_dashboard_only_counts_the_students_own_money(): void
    {
        Income::factory()->create(['amount' => '9999.00']);
        Expense::factory()->create(['amount' => '5000.00']);

        $this->getJson('/api/v1/dashboard')
            ->assertJsonPath('data.available_balance', '0.00')
            ->assertJsonPath('data.recent_transactions', []);
    }
}
