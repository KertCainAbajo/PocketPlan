<?php

namespace Tests\Unit\Services;

use App\Enums\BudgetState;
use App\Enums\SpendingStatus;
use App\Services\Budget\BudgetCalculator;
use App\Services\Budget\BudgetSnapshot;
use Brick\Math\BigDecimal;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class BudgetCalculatorTest extends TestCase
{
    private BudgetCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new BudgetCalculator;
    }

    /** A 7-day ₱2,000 budget from Oct 5 to Oct 11. */
    private function weekly(
        string $spentBeforeToday = '0',
        string $spentToday = '0',
        string $today = '2026-10-07',
        string $limit = '2000.00',
        bool $completed = false,
        ?string $balance = null,
    ): BudgetSnapshot {
        return $this->calculator->calculate(
            spendingLimit: BigDecimal::of($limit),
            spentBeforeToday: BigDecimal::of($spentBeforeToday),
            spentToday: BigDecimal::of($spentToday),
            startDate: CarbonImmutable::parse('2026-10-05'),
            endDate: CarbonImmutable::parse('2026-10-11'),
            today: CarbonImmutable::parse($today),
            warningPercent: 80,
            completed: $completed,
            balanceStartOfDay: $balance === null ? null : BigDecimal::of($balance),
        );
    }

    public function test_spec_example_2000_budget_650_spent_5_days_left_gives_270_per_day(): void
    {
        // Oct 7 → Oct 11 is 5 days including today.
        $s = $this->weekly(spentBeforeToday: '650');

        $this->assertSame(BudgetState::Active, $s->state);
        $this->assertSame(5, $s->daysRemaining);
        $this->assertSame('1350.00', (string) $s->remaining);
        $this->assertSame('270.00', (string) $s->dailyTarget);
        $this->assertSame('285.71', (string) $s->initialDaily);
    }

    public function test_spending_today_does_not_lower_todays_target(): void
    {
        $s = $this->weekly(spentBeforeToday: '650', spentToday: '120');

        $this->assertSame('270.00', (string) $s->dailyTarget);
        $this->assertSame('150.00', (string) $s->todayRemaining);
        $this->assertSame('1230.00', (string) $s->remaining);
        $this->assertSame(SpendingStatus::Safe, $s->status);
    }

    public function test_daily_overage_does_not_mean_the_budget_is_exhausted(): void
    {
        // Spec §8: target 270, spent 300 today → ₱30 over today, ₱1,050 still left overall.
        $s = $this->weekly(spentBeforeToday: '650', spentToday: '300');

        $this->assertSame(SpendingStatus::Over, $s->status);
        $this->assertSame('-30.00', (string) $s->todayRemaining);
        $this->assertSame('1050.00', (string) $s->remaining);
        $this->assertFalse($s->isOverspent);
        $this->assertFalse($s->isExhausted);
    }

    /**
     * @return array<string, array{string, SpendingStatus}>
     */
    public static function thresholds(): array
    {
        // Daily target is 270.00; 80% of it is 216.00.
        return [
            'nothing spent' => ['0', SpendingStatus::Safe],
            'just under 80%' => ['215.99', SpendingStatus::Safe],
            'exactly 80%' => ['216.00', SpendingStatus::Watch],
            'exactly the target' => ['270.00', SpendingStatus::Watch],
            'one centavo over' => ['270.01', SpendingStatus::Over],
        ];
    }

    #[DataProvider('thresholds')]
    public function test_status_thresholds(string $spentToday, SpendingStatus $expected): void
    {
        $this->assertSame($expected, $this->weekly(spentBeforeToday: '650', spentToday: $spentToday)->status);
    }

    public function test_first_day_target_equals_initial_daily(): void
    {
        $s = $this->weekly(today: '2026-10-05');

        $this->assertSame(7, $s->daysRemaining);
        $this->assertSame(1, $s->daysElapsed);
        $this->assertSame('285.71', (string) $s->dailyTarget);
    }

    public function test_last_day_gets_everything_that_is_left(): void
    {
        $s = $this->weekly(spentBeforeToday: '1800', today: '2026-10-11');

        $this->assertSame(1, $s->daysRemaining);
        $this->assertSame('200.00', (string) $s->dailyTarget);
    }

    public function test_upcoming_budget_shows_the_initial_daily_amount(): void
    {
        $s = $this->weekly(today: '2026-10-01');

        $this->assertSame(BudgetState::Upcoming, $s->state);
        $this->assertSame(7, $s->daysRemaining);
        $this->assertSame(0, $s->daysElapsed);
        $this->assertSame('285.71', (string) $s->dailyTarget);
        $this->assertSame(SpendingStatus::Safe, $s->status);
    }

    public function test_ended_budget_has_no_daily_target_and_no_division_by_zero(): void
    {
        $s = $this->weekly(spentBeforeToday: '1500', today: '2026-10-12');

        $this->assertSame(BudgetState::Ended, $s->state);
        $this->assertSame(0, $s->daysRemaining);
        $this->assertNull($s->dailyTarget);
        $this->assertNull($s->status);
        $this->assertSame('500.00', (string) $s->remaining);
    }

    public function test_completed_budget(): void
    {
        $s = $this->weekly(spentBeforeToday: '2000', completed: true);

        $this->assertSame(BudgetState::Completed, $s->state);
        $this->assertNull($s->dailyTarget);
        $this->assertSame(100, $s->percentUsed);
    }

    public function test_overspent_budget_has_zero_target_and_negative_remaining(): void
    {
        $s = $this->weekly(spentBeforeToday: '2100');

        $this->assertTrue($s->isOverspent);
        $this->assertTrue($s->isExhausted);
        $this->assertSame('0.00', (string) $s->dailyTarget);
        $this->assertSame('-100.00', (string) $s->remaining);
        $this->assertSame(SpendingStatus::Watch, $s->status, 'Nothing left and nothing spent today is a warning');
        $this->assertSame(SpendingStatus::Over, $this->weekly(spentBeforeToday: '2100', spentToday: '1')->status);
    }

    public function test_zero_limit_budget(): void
    {
        $s = $this->weekly(limit: '0.00');

        $this->assertSame('0.00', (string) $s->dailyTarget);
        $this->assertSame(0, $s->percentUsed);
        $this->assertSame(SpendingStatus::Over, $this->weekly(limit: '0.00', spentToday: '5')->status);
    }

    public function test_low_balance_caps_the_recommendation(): void
    {
        // Budget allows 270/day, but only ₱500 is actually on hand for 5 days.
        $s = $this->weekly(spentBeforeToday: '650', balance: '500');

        $this->assertSame('100.00', (string) $s->dailyTarget);
        $this->assertSame('balance', $s->limitedBy);
    }

    public function test_healthy_balance_leaves_the_budget_target_unchanged(): void
    {
        $s = $this->weekly(spentBeforeToday: '650', balance: '5000');

        $this->assertSame('270.00', (string) $s->dailyTarget);
        $this->assertSame('budget', $s->limitedBy);
    }

    public function test_negative_balance_recommends_zero(): void
    {
        $this->assertSame('0.00', (string) $this->weekly(balance: '-50')->dailyTarget);
    }

    public function test_spending_pace_warning(): void
    {
        // 3 days elapsed, ₱1,200 spent → ₱400/day × 7 days = ₱2,800 > ₱2,000.
        $fast = $this->weekly(spentBeforeToday: '1000', spentToday: '200');
        $this->assertSame('400.00', (string) $fast->averageDaily);
        $this->assertTrue($fast->paceExceedsLimit);

        $this->assertFalse($this->weekly(spentBeforeToday: '400')->paceExceedsLimit);
    }

    public function test_dates_are_compared_by_calendar_day_not_time(): void
    {
        $s = $this->calculator->calculate(
            spendingLimit: BigDecimal::of('2000'),
            spentBeforeToday: BigDecimal::of('650'),
            spentToday: BigDecimal::zero(),
            startDate: CarbonImmutable::parse('2026-10-05 00:00:00'),
            endDate: CarbonImmutable::parse('2026-10-11 00:00:00'),
            today: CarbonImmutable::parse('2026-10-07 23:59:59'),
        );

        $this->assertSame(5, $s->daysRemaining);
        $this->assertSame('270.00', (string) $s->dailyTarget);
    }

    public function test_to_array_formats_money_as_two_decimal_strings(): void
    {
        $array = $this->weekly(spentBeforeToday: '650')->toArray();

        $this->assertSame('270.00', $array['daily_target']);
        $this->assertSame('1350.00', $array['remaining']);
        $this->assertSame('safe', $array['status']);
        $this->assertSame('Safe', $array['status_label']);
    }
}
