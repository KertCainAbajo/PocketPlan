<?php

namespace App\Services;

use App\Models\SavingsContribution;
use App\Models\User;
use App\Support\Money;
use Brick\Math\BigDecimal;
use Carbon\CarbonInterface;

/**
 * Money the student actually has: income received minus expenses minus money
 * moved into savings goals. Savings are never counted as expenses.
 */
class BalanceService
{
    public function available(User $user): BigDecimal
    {
        return Money::sum($user->incomes()->toBase())
            ->minus(Money::sum($user->expenses()->toBase()))
            ->minus($this->savingsTotal($user));
    }

    /**
     * Balance before any of today's expenses: all income (including today's),
     * minus expenses dated before today, minus savings.
     */
    public function startOfDay(User $user, CarbonInterface $today): BigDecimal
    {
        $expensesBeforeToday = Money::sum($user->expenses()->where('spent_on', '<', $today->toDateString())->toBase());

        return Money::sum($user->incomes()->toBase())
            ->minus($expensesBeforeToday)
            ->minus($this->savingsTotal($user));
    }

    /**
     * Income and expense totals between two dates (inclusive).
     *
     * @return array{income: BigDecimal, expenses: BigDecimal}
     */
    public function totalsBetween(User $user, CarbonInterface $from, CarbonInterface $to): array
    {
        return [
            'income' => Money::sum($user->incomes()->whereBetween('received_on', [$from->toDateString(), $to->toDateString()])->toBase()),
            'expenses' => Money::sum($user->expenses()->whereBetween('spent_on', [$from->toDateString(), $to->toDateString()])->toBase()),
        ];
    }

    public function savingsTotal(User $user): BigDecimal
    {
        return Money::sum(SavingsContribution::query()->where('user_id', $user->id)->toBase())
            ->plus($this->periodSavings($user));
    }

    private function periodSavings(User $user): BigDecimal
    {
        return Money::sum($user->budgetRollovers()->toBase());
    }
}
