<?php

namespace Tests\Feature\Database;

use App\Models\Budget;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The database itself rejects invalid money and dates, as a last line of
 * defence behind request validation. CHECK constraints are MySQL-only.
 */
class SchemaConstraintsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('CHECK constraints are only created on MySQL.');
        }
    }

    public function test_budget_end_date_cannot_be_before_start_date(): void
    {
        $this->expectException(QueryException::class);

        Budget::factory()->create(['start_date' => '2026-10-10', 'end_date' => '2026-10-09']);
    }

    public function test_savings_target_cannot_exceed_the_allowance(): void
    {
        $this->expectException(QueryException::class);

        Budget::factory()->create(['total_allowance' => '1000.00', 'savings_target' => '1000.01']);
    }

    public function test_expense_amount_must_be_positive(): void
    {
        $this->expectException(QueryException::class);

        Expense::factory()->create(['amount' => '0.00']);
    }

    public function test_money_is_stored_exactly(): void
    {
        $budget = Budget::factory()->create(['total_allowance' => '2000.10']);
        Expense::factory()->count(3)->create(['user_id' => $budget->user_id, 'budget_id' => $budget->id, 'amount' => '0.10']);

        $this->assertSame('0.30', (string) Expense::query()->where('budget_id', $budget->id)->sum('amount'));
        $this->assertSame('2000.10', $budget->fresh()?->total_allowance);
    }

    public function test_deleting_a_user_removes_their_financial_records(): void
    {
        $budget = Budget::factory()->create();
        Expense::factory()->create(['user_id' => $budget->user_id, 'budget_id' => $budget->id]);

        User::query()->whereKey($budget->user_id)->delete();

        $this->assertDatabaseCount('budgets', 0);
        $this->assertDatabaseCount('expenses', 0);
    }
}
