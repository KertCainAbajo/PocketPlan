<?php

namespace App\Services;

use App\Enums\AllowanceFrequency;
use App\Enums\BudgetStatus;
use App\Models\Budget;
use App\Models\BudgetRollover;
use App\Models\RecurringIncome;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

/** Closes allowance budgets, saves their unused amount, and opens future periods. */
class AllowancePeriodManager
{
    private const MAX_PERIODS_PER_RUN = 500;

    /** Complete every due period for a user. Re-running is safe. */
    public function ensureCurrent(User $user): int
    {
        return DB::transaction(function () use ($user) {
            User::query()->whereKey($user->id)->lockForUpdate()->first();

            $schedule = $user->recurringIncomes()
                ->where('is_allowance', true)
                ->orderByDesc('id')
                ->first();

            if (! $schedule) {
                return 0;
            }

            $today = $user->today()->toImmutable();
            $budget = $user->budgets()
                ->where('recurring_income_id', $schedule->id)
                ->orderByDesc('allowance_occurrence')
                ->first();

            if (! $budget) {
                return 0;
            }

            $processed = 0;
            while ($budget->end_date->toImmutable()->lessThan($today) && $processed < self::MAX_PERIODS_PER_RUN) {
                $this->closePeriod($budget, $user);
                $processed++;

                if (! $schedule->is_active) {
                    break;
                }

                $nextIndex = (int) $budget->allowance_occurrence + 1;
                $nextStart = $schedule->occurrence($nextIndex);
                $nextOccurrence = $schedule->occurrence($nextIndex + 1);
                $scheduleEnd = $schedule->end_date?->toImmutable();
                if ($scheduleEnd && $nextStart->greaterThan($scheduleEnd)) {
                    break;
                }

                $nextBudget = $user->budgets()->where('recurring_income_id', $schedule->id)
                    ->where('allowance_occurrence', $nextIndex)->first();

                if (! $nextBudget) {
                    $frequency = AllowanceFrequency::tryFrom($schedule->frequency->value);
                    if (! $frequency) {
                        break;
                    }
                    $nextBudget = new Budget([
                        'name' => ucfirst($frequency->value).' allowance',
                        'spending_limit' => $schedule->amount,
                        'start_date' => $nextStart->toDateString(),
                        'end_date' => $nextOccurrence->subDay()->toDateString(),
                        'frequency' => $frequency,
                        'is_allowance' => true,
                        'allowance_occurrence' => $nextIndex,
                    ]);
                    $nextBudget->user()->associate($user);
                    $nextBudget->recurringIncome()->associate($schedule);
                    $nextBudget->save();

                    $limits = $budget->categoryLimits()->get(['category_id', 'limit_amount'])->map(fn ($limit) => [
                        'category_id' => $limit->category_id,
                        'limit_amount' => $limit->limit_amount,
                    ])->all();
                    if ($limits) {
                        $nextBudget->categoryLimits()->createMany($limits);
                    }
                }

                $budget = $nextBudget;
            }

            return $processed;
        });
    }

    /** Close every due allowance period for all users (scheduled task). */
    public function advanceAll(): int
    {
        $processed = 0;
        User::query()->whereHas('recurringIncomes', fn ($query) => $query->where('is_allowance', true))
            ->chunkById(200, function ($users) use (&$processed) {
                foreach ($users as $user) {
                    $processed += $this->ensureCurrent($user);
                }
            });

        return $processed;
    }

    private function closePeriod(Budget $budget, User $user): void
    {
        $spent = Money::sum($budget->expenses()->toBase());
        $unspent = Money::max(Money::of($budget->spending_limit)->minus($spent), Money::zero());

        BudgetRollover::query()->firstOrCreate(
            ['budget_id' => $budget->id],
            [
                'user_id' => $user->id,
                'amount' => Money::format($unspent),
                'saved_on' => $budget->end_date->toDateString(),
            ],
        );

        if ($budget->isActive()) {
            $budget->forceFill([
                'status' => BudgetStatus::Completed,
                'completed_at' => now(),
            ])->save();
        }
    }
}
