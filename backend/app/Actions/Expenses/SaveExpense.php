<?php

namespace App\Actions\Expenses;

use App\Models\Expense;
use App\Models\User;
use App\Services\Budget\BudgetPeriods;
use Carbon\CarbonImmutable;

/**
 * Creates or updates an expense. The budget it counts against is always
 * decided by the server from its date, never by the client.
 *
 * @phpstan-type ExpenseInput array{
 *     account_id?: int|null,
 *     category_id: int,
 *     amount: string,
 *     description: string,
 *     notes?: string|null,
 *     payment_method?: string|null,
 *     spent_on: string,
 *     spent_time?: string|null,
 * }
 */
class SaveExpense
{
    public function __construct(private readonly BudgetPeriods $periods) {}

    /**
     * @param  ExpenseInput  $input
     */
    public function create(User $user, array $input): Expense
    {
        $expense = new Expense;
        $expense->user()->associate($user);

        return $this->fill($expense, $user, $input);
    }

    /**
     * @param  ExpenseInput  $input
     */
    public function update(Expense $expense, array $input): Expense
    {
        return $this->fill($expense, $expense->user, $input);
    }

    /**
     * @param  ExpenseInput  $input
     */
    private function fill(Expense $expense, User $user, array $input): Expense
    {
        $expense->fill([
            'account_id' => $input['account_id'] ?? $user->ensureDefaultAccount()->id,
            'category_id' => $input['category_id'],
            'amount' => $input['amount'],
            'description' => $input['description'],
            'notes' => $input['notes'] ?? null,
            'payment_method' => $input['payment_method'] ?? null,
            'spent_on' => $input['spent_on'],
            'spent_time' => $input['spent_time'] ?? null,
        ]);
        $expense->budget_id = $this->periods->budgetFor($user, CarbonImmutable::parse($input['spent_on']))?->id;
        $expense->save();

        return $expense->load('category');
    }
}
