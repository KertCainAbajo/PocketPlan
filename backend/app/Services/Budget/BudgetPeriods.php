<?php

namespace App\Services\Budget;

use App\Exceptions\ConflictException;
use App\Models\Budget;
use App\Models\User;
use Carbon\CarbonInterface;

/**
 * Keeps budget periods consistent: a student's budgets never overlap, so every
 * expense belongs to exactly one budget (or none), decided by its date.
 */
class BudgetPeriods
{
    /** The budget whose period contains $date, if any. */
    public function budgetFor(User $user, CarbonInterface $date): ?Budget
    {
        $day = $date->toDateString();

        return $user->budgets()
            ->where('start_date', '<=', $day)
            ->where('end_date', '>=', $day)
            ->first();
    }

    /** The active (not completed) budget running today, if any. */
    public function current(User $user): ?Budget
    {
        $budget = $this->budgetFor($user, $user->today());

        return $budget?->isActive() ? $budget : null;
    }

    /**
     * Call inside a transaction after locking the user row, so two requests
     * cannot create overlapping budgets at the same time.
     *
     * @throws ConflictException
     */
    public function assertNoOverlap(User $user, CarbonInterface $start, CarbonInterface $end, ?int $ignoreBudgetId = null): void
    {
        $conflict = $user->budgets()
            ->when($ignoreBudgetId, fn ($q) => $q->whereKeyNot($ignoreBudgetId))
            ->where('start_date', '<=', $end->toDateString())
            ->where('end_date', '>=', $start->toDateString())
            ->first();

        if ($conflict) {
            throw new ConflictException(
                "These dates overlap your budget \"{$conflict->name}\" ({$conflict->start_date->toDateString()} to {$conflict->end_date->toDateString()}).",
                ['conflicting_budget_id' => $conflict->id],
            );
        }
    }

    /**
     * Re-link expenses after a budget's dates change: expenses now outside the
     * period become unbudgeted, unbudgeted expenses inside it join the budget.
     */
    public function syncExpenses(Budget $budget): void
    {
        $start = $budget->start_date->toDateString();
        $end = $budget->end_date->toDateString();

        $budget->expenses()
            ->where(fn ($q) => $q->where('spent_on', '<', $start)->orWhere('spent_on', '>', $end))
            ->update(['budget_id' => null]);

        $budget->user->expenses()
            ->whereNull('budget_id')
            ->whereBetween('spent_on', [$start, $end])
            ->update(['budget_id' => $budget->id]);
    }
}
