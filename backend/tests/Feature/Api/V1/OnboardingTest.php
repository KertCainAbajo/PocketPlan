<?php

namespace Tests\Feature\Api\V1;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\InteractsWithStudents;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use InteractsWithStudents, RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedCategories();
        $this->freezeToday();

        // fresh(): load every column, exactly as Sanctum does for a real request.
        $this->student = User::factory()->create()->fresh() ?? throw new \RuntimeException('user missing');
        $this->student->notificationPreference()->create();
        Sanctum::actingAs($this->student);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'currency' => 'PHP',
            'allowance_amount' => '2000',
            'frequency' => 'weekly',
            'start_date' => '2026-10-05',
        ], $overrides);
    }

    public function test_onboarding_records_the_allowance_and_creates_the_first_budget(): void
    {
        $this->postJson('/api/v1/onboarding', $this->payload([
            'savings_goal' => ['name' => 'New phone', 'target_amount' => '8000', 'target_date' => '2027-03-01'],
        ]))->assertOk()->assertJsonPath('data.is_onboarded', true);

        $this->student->refresh();
        $this->assertSame('2000.00', $this->student->incomes()->sole()->amount);

        $budget = $this->student->budgets()->sole();
        $this->assertSame('2000.00', $budget->spending_limit);
        $this->assertSame('2026-10-11', $budget->end_date->toDateString());
        $this->assertSame('New phone', $this->student->savingsGoals()->sole()->name);

        $this->getJson('/api/v1/dashboard')
            ->assertJsonPath('data.available_balance', '2000.00')
            ->assertJsonPath('data.budget.summary.daily_target', '400.00'); // 2000 ÷ 5 remaining days
    }

    public function test_recurring_allowance_creates_a_schedule(): void
    {
        $this->postJson('/api/v1/onboarding', $this->payload(['recurring' => true, 'currency' => 'USD']))->assertOk();

        $this->assertSame('USD', $this->student->fresh()?->currency);
        $this->assertSame('weekly', $this->student->recurringIncomes()->sole()->frequency->value);
        $this->assertSame(1, $this->student->incomes()->count());
    }

    public function test_future_start_without_a_schedule_records_no_income_yet(): void
    {
        $this->postJson('/api/v1/onboarding', $this->payload(['start_date' => '2026-10-12']))->assertOk();

        $this->assertSame(0, $this->student->incomes()->count());
        $this->assertSame(1, $this->student->budgets()->count());
    }

    public function test_onboarding_can_only_happen_once(): void
    {
        $this->postJson('/api/v1/onboarding', $this->payload())->assertOk();
        $this->postJson('/api/v1/onboarding', $this->payload())->assertStatus(409);

        $this->assertSame(1, $this->student->budgets()->count());
    }

    public function test_validation(): void
    {
        $this->postJson('/api/v1/onboarding', $this->payload(['currency' => 'BTC']))->assertJsonValidationErrors('currency');
        $this->postJson('/api/v1/onboarding', $this->payload(['frequency' => 'custom']))->assertJsonValidationErrors('end_date');
        $this->postJson('/api/v1/onboarding', $this->payload(['allowance_amount' => '-5']))->assertJsonValidationErrors('allowance_amount');
        $this->postJson('/api/v1/onboarding', $this->payload(['savings_goal' => ['name' => 'Trip']]))->assertJsonValidationErrors('savings_goal.target_amount');

        $this->assertNull($this->student->fresh()?->onboarded_at);
    }
}
