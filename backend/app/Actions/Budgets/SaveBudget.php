<?php

namespace App\Actions\Budgets;

use App\Enums\AllowanceFrequency;
use App\Exceptions\ConflictException;
use App\Models\Budget;
use App\Models\User;
use App\Services\Budget\BudgetPeriods;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Creates or updates a budget, keeping periods non-overlapping and expenses
 * linked to the right budget.
 *
 * @phpstan-type BudgetInput array{
 *     name: string,
 *     spending_limit: string,
 *     frequency: string,
 *     start_date: string,
 *     end_date?: string|null,
 *     category_limits?: list<array{category_id: int, limit_amount: string}>|null,
 * }
 */
class SaveBudget
{
    public function __construct(private readonly BudgetPeriods $periods) {}

    /**
     * @param  BudgetInput  $input
     *
     * @throws ConflictException|ValidationException
     */
    public function create(User $user, array $input): Budget
    {
        return DB::transaction(function () use ($user, $input) {
            User::query()->whereKey($user->id)->lockForUpdate()->first();

            $budget = new Budget;
            $budget->user()->associate($user);

            return $this->fill($budget, $input);
        });
    }

    /**
     * @param  BudgetInput  $input
     *
     * @throws ConflictException|ValidationException
     */
    public function update(Budget $budget, array $input): Budget
    {
        if (! $budget->isActive()) {
            throw new ConflictException('Completed budgets cannot be edited.');
        }

        return DB::transaction(function () use ($budget, $input) {
            User::query()->whereKey($budget->user_id)->lockForUpdate()->first();

            return $this->fill($budget, $input);
        });
    }

    /**
     * @param  BudgetInput  $input
     */
    private function fill(Budget $budget, array $input): Budget
    {
        $frequency = AllowanceFrequency::from($input['frequency']);
        $start = CarbonImmutable::parse($input['start_date']);
        $end = isset($input['end_date']) ? CarbonImmutable::parse($input['end_date']) : $frequency->defaultEndDate($start);

        if ($end === null) {
            throw ValidationException::withMessages(['end_date' => ['An end date is required for a custom budget.']]);
        }

        $this->periods->assertNoOverlap($budget->user, $start, $end, $budget->exists ? $budget->id : null);

        $budget->fill([
            'name' => $input['name'],
            'spending_limit' => $input['spending_limit'],
            'frequency' => $frequency,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
        ])->save();

        if (array_key_exists('category_limits', $input) && $input['category_limits'] !== null) {
            $budget->categoryLimits()->delete();
            $budget->categoryLimits()->createMany($input['category_limits']);
        }

        $this->periods->syncExpenses($budget);

        return $budget->refresh();
    }
}
