<?php

namespace App\Actions\Incomes;

use App\Models\RecurringIncome;
use App\Models\User;
use App\Services\RecurringIncomeGenerator;

/**
 * Creates a recurring income schedule and immediately records any payments
 * already due (e.g. a weekly allowance that started last Monday).
 *
 * @phpstan-type RecurringIncomeInput array{
 *     category_id: int,
 *     amount: string,
 *     description: string,
 *     frequency: string,
 *     start_date: string,
 *     end_date?: string|null,
 *     is_allowance?: bool,
 * }
 */
class CreateRecurringIncome
{
    public function __construct(private readonly RecurringIncomeGenerator $generator) {}

    /**
     * @param  RecurringIncomeInput  $input
     */
    public function handle(User $user, array $input): RecurringIncome
    {
        $schedule = new RecurringIncome([
            'category_id' => $input['category_id'],
            'amount' => $input['amount'],
            'description' => $input['description'],
            'frequency' => $input['frequency'],
            'start_date' => $input['start_date'],
            'end_date' => $input['end_date'] ?? null,
            'is_allowance' => $input['is_allowance'] ?? false,
        ]);
        $schedule->user()->associate($user);
        $schedule->occurrences_generated = 0;
        $schedule->syncNextDueDate();
        $schedule->save();

        $this->generator->generateForUser($user);

        return $schedule->refresh()->load('category');
    }
}
