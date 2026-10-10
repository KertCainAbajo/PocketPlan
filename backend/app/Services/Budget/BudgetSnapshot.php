<?php

namespace App\Services\Budget;

use App\Enums\BudgetState;
use App\Enums\SpendingStatus;
use App\Support\Money;
use Brick\Math\BigDecimal;

/**
 * The calculated state of a budget on a given day. Immutable; produced by
 * BudgetCalculator. Monetary values are exact decimals.
 */
final readonly class BudgetSnapshot
{
    public function __construct(
        public BudgetState $state,
        public int $totalDays,
        public int $daysElapsed,
        /** Includes today while the budget is running. */
        public int $daysRemaining,
        public BigDecimal $spendingLimit,
        public BigDecimal $spentTotal,
        public BigDecimal $spentToday,
        /** spending_limit − spent_total; negative when overspent. */
        public BigDecimal $remaining,
        /** spending_limit ÷ total_days. */
        public BigDecimal $initialDaily,
        /** Recommended spending for today; null once the budget has ended. */
        public ?BigDecimal $dailyTarget,
        /** daily_target − spent_today; negative = today's overage. */
        public ?BigDecimal $todayRemaining,
        public ?SpendingStatus $status,
        /** 'budget' or 'balance': which constraint produced the daily target. */
        public ?string $limitedBy,
        public int $percentUsed,
        public bool $isOverspent,
        /** Nothing left to spend before today's purchases. */
        public bool $isExhausted,
        /** Average spent per elapsed day. */
        public BigDecimal $averageDaily,
        /** True when the current pace would exceed the limit before the end date. */
        public bool $paceExceedsLimit,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'state' => $this->state->value,
            'total_days' => $this->totalDays,
            'days_elapsed' => $this->daysElapsed,
            'days_remaining' => $this->daysRemaining,
            'spending_limit' => Money::format($this->spendingLimit),
            'spent_total' => Money::format($this->spentTotal),
            'spent_today' => Money::format($this->spentToday),
            'remaining' => Money::format($this->remaining),
            'initial_daily' => Money::format($this->initialDaily),
            'daily_target' => $this->dailyTarget ? Money::format($this->dailyTarget) : null,
            'today_remaining' => $this->todayRemaining ? Money::format($this->todayRemaining) : null,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'limited_by' => $this->limitedBy,
            'percent_used' => $this->percentUsed,
            'is_overspent' => $this->isOverspent,
            'is_exhausted' => $this->isExhausted,
            'average_daily' => Money::format($this->averageDaily),
            'pace_exceeds_limit' => $this->paceExceedsLimit,
        ];
    }
}
