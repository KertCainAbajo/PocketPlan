<?php

namespace App\Services\Budget;

use App\Models\Budget;
use App\Models\BudgetCategoryLimit;
use App\Models\User;
use App\Services\BalanceService;
use App\Support\Money;

/**
 * Loads the numbers a budget needs from the database and runs the calculator.
 */
class BudgetSummaryService
{
    public function __construct(
        private readonly BudgetCalculator $calculator,
        private readonly BalanceService $balance,
    ) {}

    public function summarize(Budget $budget): BudgetSnapshot
    {
        $user = $budget->loadMissing('user.notificationPreference')->user;
        $today = $user->today()->toImmutable();
        $todayString = $today->toDateString();

        // Only the budget running today is capped by the money actually on hand,
        // and only for students who record income (otherwise the balance is unknown).
        $capByBalance = $budget->isActive()
            && $budget->start_date->toDateString() <= $todayString
            && $budget->end_date->toDateString() >= $todayString
            && $user->incomes()->exists();

        return $this->calculator->calculate(
            spendingLimit: Money::of($budget->spending_limit),
            spentBeforeToday: Money::sum($budget->expenses()->where('spent_on', '<', $todayString)->toBase()),
            spentToday: Money::sum($budget->expenses()->where('spent_on', $todayString)->toBase()),
            startDate: $budget->start_date->toImmutable(),
            endDate: $budget->end_date->toImmutable(),
            today: $today,
            warningPercent: $this->warningPercent($user),
            completed: ! $budget->isActive(),
            balanceStartOfDay: $capByBalance ? $this->balance->startOfDay($user, $today) : null,
        );
    }

    /**
     * Spending against each category limit of the budget.
     *
     * @return list<array<string, mixed>>
     */
    public function categoryLimits(Budget $budget): array
    {
        $warningPercent = $this->warningPercent($budget->loadMissing('user.notificationPreference')->user);

        $spentByCategory = $budget->expenses()
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        return $budget->categoryLimits()->with('category')->get()
            ->map(function (BudgetCategoryLimit $limit) use ($spentByCategory, $warningPercent) {
                $cap = Money::of($limit->limit_amount);
                $spent = Money::of($spentByCategory[$limit->category_id] ?? '0');

                return [
                    'category_id' => $limit->category_id,
                    'category_name' => $limit->category->name,
                    'category_icon' => $limit->category->icon,
                    'limit_amount' => Money::format($cap),
                    'spent' => Money::format($spent),
                    'remaining' => Money::format($cap->minus($spent)),
                    'percent_used' => Money::percent($spent, $cap),
                    'status' => $this->calculator->status($spent, $cap, $warningPercent)->value,
                ];
            })
            ->values()
            ->all();
    }

    private function warningPercent(User $user): int
    {
        return $user->notificationPreference->warning_threshold_percent ?? 80;
    }
}
