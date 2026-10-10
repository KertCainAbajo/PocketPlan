<?php

namespace App\Actions\Budgets;

use App\Enums\BudgetStatus;
use App\Exceptions\ConflictException;
use App\Models\Budget;
use App\Services\Budget\BudgetPeriods;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Closes a budget, optionally early. Closing early shortens the period so a
 * new budget can start the next day; expenses after the new end date become
 * unbudgeted until a budget covers them.
 */
class CompleteBudget
{
    public function __construct(private readonly BudgetPeriods $periods) {}

    /**
     * @param  string|null  $endDate  last day of the budget (defaults to today, or the planned end if earlier)
     *
     * @throws ConflictException|ValidationException
     */
    public function handle(Budget $budget, ?string $endDate = null): Budget
    {
        if (! $budget->isActive()) {
            throw new ConflictException('This budget is already completed.');
        }

        $today = $budget->user->today()->toImmutable();
        $start = $budget->start_date->toImmutable();
        $plannedEnd = $budget->end_date->toImmutable();

        if ($today->lessThan($start)) {
            throw new ConflictException('A budget cannot be completed before it starts.');
        }

        $latestEnd = $plannedEnd->lessThan($today) ? $plannedEnd : $today;
        $end = $endDate ? CarbonImmutable::parse($endDate) : $latestEnd;

        if ($end->lessThan($start) || $end->greaterThan($latestEnd)) {
            throw ValidationException::withMessages([
                'end_date' => ["The end date must be between {$start->toDateString()} and {$latestEnd->toDateString()}."],
            ]);
        }

        return DB::transaction(function () use ($budget, $end) {
            $budget->forceFill([
                'end_date' => $end->toDateString(),
                'status' => BudgetStatus::Completed,
                'completed_at' => now(),
            ])->save();

            $this->periods->syncExpenses($budget);

            return $budget->refresh();
        });
    }
}
