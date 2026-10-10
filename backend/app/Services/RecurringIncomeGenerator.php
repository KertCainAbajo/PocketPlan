<?php

namespace App\Services;

use App\Models\Income;
use App\Models\RecurringIncome;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Turns due recurring-income schedules into Income records. Safe to run any
 * number of times: the unique (recurring_income_id, received_on) index and a
 * row lock guarantee each payment date is recorded once.
 */
class RecurringIncomeGenerator
{
    /** Upper bound on payments created per schedule per run (≈ one year of daily payments). */
    private const MAX_CATCH_UP = 400;

    /** Generate every due payment for one student (called before showing balances). */
    public function generateForUser(User $user): int
    {
        $today = $user->today()->toImmutable();

        return $user->recurringIncomes()
            ->where('is_active', true)
            ->where('next_due_on', '<=', $today->toDateString())
            ->pluck('id')
            ->sum(fn (int $id) => $this->generate($id, $today));
    }

    /** Generate every due payment for all students (scheduled command). */
    public function generateAll(): int
    {
        $created = 0;

        // Timezones run up to 14 hours ahead of UTC, so "due" is checked per user below.
        $horizon = now('UTC')->addDay()->toDateString();

        RecurringIncome::query()
            ->with('user')
            ->where('is_active', true)
            ->where('next_due_on', '<=', $horizon)
            ->chunkById(200, function ($schedules) use (&$created) {
                foreach ($schedules as $schedule) {
                    $created += $this->generate($schedule->id, $schedule->user->today()->toImmutable());
                }
            });

        return $created;
    }

    private function generate(int $scheduleId, CarbonImmutable $today): int
    {
        return DB::transaction(function () use ($scheduleId, $today) {
            $schedule = RecurringIncome::query()->lockForUpdate()->find($scheduleId);
            if (! $schedule || ! $schedule->is_active) {
                return 0;
            }

            $created = 0;
            $endDate = $schedule->end_date?->toImmutable();

            for ($i = 0; $i < self::MAX_CATCH_UP; $i++) {
                $due = $schedule->next_due_on->toImmutable();
                if ($due->greaterThan($today) || ($endDate && $due->greaterThan($endDate))) {
                    break;
                }

                $created += $this->record($schedule, $due);
                $schedule->occurrences_generated++;
                $schedule->syncNextDueDate();
            }

            if ($endDate && $schedule->next_due_on->toImmutable()->greaterThan($endDate)) {
                $schedule->is_active = false;
            }

            $schedule->save();

            return $created;
        });
    }

    private function record(RecurringIncome $schedule, CarbonImmutable $date): int
    {
        try {
            DB::transaction(function () use ($schedule, $date) {
                $income = new Income([
                    'category_id' => $schedule->category_id,
                    'amount' => $schedule->amount,
                    'description' => $schedule->description,
                    'received_on' => $date->toDateString(),
                ]);
                $income->user_id = $schedule->user_id;
                $income->recurring_income_id = $schedule->id;
                $income->save();
            });

            return 1;
        } catch (UniqueConstraintViolationException) {
            return 0; // Already recorded by an earlier run.
        }
    }
}
