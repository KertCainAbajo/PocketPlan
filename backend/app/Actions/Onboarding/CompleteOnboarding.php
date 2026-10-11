<?php

namespace App\Actions\Onboarding;

use App\Actions\Budgets\SaveBudget;
use App\Actions\Incomes\CreateRecurringIncome;
use App\Enums\AllowanceFrequency;
use App\Enums\CategoryType;
use App\Exceptions\ConflictException;
use App\Models\Category;
use App\Models\Income;
use App\Models\SavingsGoal;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * First-time setup: currency, the first allowance (as income and, optionally,
 * a recurring schedule), the first budget, and an optional savings goal.
 * Everything succeeds or nothing is saved.
 *
 * @phpstan-type OnboardingInput array{
 *     currency: string,
 *     allowance_amount: string,
 *     frequency: string,
 *     start_date: string,
 *     end_date?: string|null,
 *     recurring?: bool,
 *     savings_goal?: array{name: string, target_amount: string, target_date?: string|null}|null,
 * }
 */
class CompleteOnboarding
{
    public function __construct(
        private readonly SaveBudget $saveBudget,
        private readonly CreateRecurringIncome $createRecurringIncome,
    ) {}

    /**
     * @param  OnboardingInput  $input
     *
     * @throws ConflictException
     */
    public function handle(User $user, array $input): User
    {
        if ($user->onboarded_at !== null) {
            throw new ConflictException('Onboarding has already been completed.');
        }

        return DB::transaction(function () use ($user, $input) {
            $frequency = AllowanceFrequency::from($input['frequency']);
            $start = CarbonImmutable::parse($input['start_date']);
            $allowanceCategory = $this->allowanceCategory();

            $user->forceFill(['currency' => $input['currency'], 'onboarded_at' => now()])->save();

            $recurrence = ($input['recurring'] ?? false) ? $frequency->recurrence() : null;
            $allowanceSchedule = null;
            if ($recurrence) {
                // The schedule records the first payment itself when it is due.
                $allowanceSchedule = $this->createRecurringIncome->handle($user, [
                    'category_id' => $allowanceCategory->id,
                    'amount' => $input['allowance_amount'],
                    'description' => 'Allowance',
                    'frequency' => $recurrence->value,
                    'start_date' => $start->toDateString(),
                    'is_allowance' => true,
                ]);
            } elseif ($start->lessThanOrEqualTo($user->today())) {
                $income = new Income([
                    'category_id' => $allowanceCategory->id,
                    'amount' => $input['allowance_amount'],
                    'description' => 'Allowance',
                    'received_on' => $start->toDateString(),
                ]);
                $income->user()->associate($user);
                $income->save();
            }

            $budget = $this->saveBudget->create($user, [
                'name' => ucfirst($frequency->value).' budget',
                'spending_limit' => $input['allowance_amount'],
                'frequency' => $frequency->value,
                'start_date' => $start->toDateString(),
                'end_date' => $input['end_date'] ?? null,
            ]);

            if ($allowanceSchedule) {
                $budget->forceFill([
                    'is_allowance' => true,
                    'recurring_income_id' => $allowanceSchedule->id,
                    'allowance_occurrence' => 0,
                ])->save();
            }

            if (! empty($input['savings_goal'])) {
                $goal = new SavingsGoal([
                    'name' => $input['savings_goal']['name'],
                    'target_amount' => $input['savings_goal']['target_amount'],
                    'target_date' => $input['savings_goal']['target_date'] ?? null,
                ]);
                $goal->user()->associate($user);
                $goal->save();
            }

            return $user->refresh();
        });
    }

    private function allowanceCategory(): Category
    {
        return Category::query()->defaults()
            ->where('type', CategoryType::Income)
            ->where('name', 'Allowance')
            ->firstOrFail();
    }
}
