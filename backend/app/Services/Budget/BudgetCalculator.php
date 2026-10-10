<?php

namespace App\Services\Budget;

use App\Enums\BudgetState;
use App\Enums\SpendingStatus;
use App\Support\Money;
use Brick\Math\BigDecimal;
use Carbon\CarbonImmutable;

/**
 * Pure budget arithmetic (no database). The rules are documented in
 * docs/PLAN.md §7 and "Revision 2"; every branch is covered by BudgetCalculatorTest.
 *
 * Key rule: the daily target is fixed at the start of the day. It is based on
 * spending *before* today, so buying something does not lower today's target.
 */
final class BudgetCalculator
{
    /**
     * @param  BigDecimal|null  $balanceStartOfDay  money on hand at the start of today; when given,
     *                                              the daily target never exceeds balance ÷ days remaining
     */
    public function calculate(
        BigDecimal $spendingLimit,
        BigDecimal $spentBeforeToday,
        BigDecimal $spentToday,
        CarbonImmutable $startDate,
        CarbonImmutable $endDate,
        CarbonImmutable $today,
        int $warningPercent = 80,
        bool $completed = false,
        ?BigDecimal $balanceStartOfDay = null,
    ): BudgetSnapshot {
        // Work with plain calendar days so mixed timezones can never skew day counts.
        $start = $this->day($startDate);
        $end = $this->day($endDate);
        $today = $this->day($today);

        $totalDays = (int) $start->diffInDays($end) + 1;
        $state = $this->state($start, $end, $today, $completed);

        [$daysElapsed, $daysRemaining] = match ($state) {
            BudgetState::Upcoming => [0, $totalDays],
            BudgetState::Active => [(int) $start->diffInDays($today) + 1, (int) $today->diffInDays($end) + 1],
            BudgetState::Ended, BudgetState::Completed => [$totalDays, 0],
        };

        $spentTotal = $spentBeforeToday->plus($spentToday);
        $remaining = $spendingLimit->minus($spentTotal);
        $initialDaily = Money::divide($spendingLimit, $totalDays);
        $leftBeforeToday = $spendingLimit->minus($spentBeforeToday);

        $dailyTarget = null;
        $limitedBy = null;
        if ($daysRemaining > 0) {
            $dailyTarget = $state === BudgetState::Upcoming
                ? $initialDaily
                : Money::divide(Money::max($leftBeforeToday, Money::zero()), $daysRemaining);
            $limitedBy = 'budget';

            if ($balanceStartOfDay !== null) {
                $balanceCap = Money::divide(Money::max($balanceStartOfDay, Money::zero()), $daysRemaining);
                if ($balanceCap->isLessThan($dailyTarget)) {
                    $dailyTarget = $balanceCap;
                    $limitedBy = 'balance';
                }
            }
        }

        $todayRemaining = $dailyTarget?->minus($spentToday);
        $status = $dailyTarget === null ? null : $this->status($spentToday, $dailyTarget, $warningPercent);

        $averageDaily = $daysElapsed > 0 ? Money::divide($spentTotal, $daysElapsed) : Money::zero();

        return new BudgetSnapshot(
            state: $state,
            totalDays: $totalDays,
            daysElapsed: $daysElapsed,
            daysRemaining: $daysRemaining,
            spendingLimit: $spendingLimit,
            spentTotal: $spentTotal,
            spentToday: $spentToday,
            remaining: $remaining,
            initialDaily: $initialDaily,
            dailyTarget: $dailyTarget,
            todayRemaining: $todayRemaining,
            status: $status,
            limitedBy: $limitedBy,
            percentUsed: Money::percent($spentTotal, $spendingLimit),
            isOverspent: $remaining->isNegative(),
            isExhausted: $state === BudgetState::Active && ! $leftBeforeToday->isPositive(),
            averageDaily: $averageDaily,
            paceExceedsLimit: $state === BudgetState::Active
                && $averageDaily->multipliedBy($totalDays)->isGreaterThan($spendingLimit),
        );
    }

    /**
     * Status of an amount spent against a limit: Safe below the warning
     * threshold, Watch from the threshold up to the limit, Over above it.
     * Used for today's spending and for per-category limits.
     */
    public function status(BigDecimal $spent, BigDecimal $limit, int $warningPercent = 80): SpendingStatus
    {
        if ($spent->isGreaterThan($limit)) {
            return SpendingStatus::Over;
        }

        if ($limit->isZero()) {
            // Nothing may be spent: no spending yet is a warning, not "safe".
            return SpendingStatus::Watch;
        }

        $threshold = $limit->multipliedBy($warningPercent)->dividedBy(100, 4);

        return $spent->isGreaterThanOrEqualTo($threshold) ? SpendingStatus::Watch : SpendingStatus::Safe;
    }

    private function day(CarbonImmutable $date): CarbonImmutable
    {
        return CarbonImmutable::parse($date->toDateString(), 'UTC');
    }

    private function state(CarbonImmutable $start, CarbonImmutable $end, CarbonImmutable $today, bool $completed): BudgetState
    {
        return match (true) {
            $completed => BudgetState::Completed,
            $today->lessThan($start) => BudgetState::Upcoming,
            $today->greaterThan($end) => BudgetState::Ended,
            default => BudgetState::Active,
        };
    }
}
