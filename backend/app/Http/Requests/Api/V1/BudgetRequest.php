<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\AllowanceFrequency;
use App\Enums\CategoryType;
use App\Http\Requests\Concerns\HasMoneyRules;
use App\Rules\SelectableCategory;
use App\Support\Money;
use Brick\Math\BigDecimal;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

/**
 * Create (POST) and full update (PUT) of a budget. end_date may be omitted for
 * daily, weekly and monthly budgets; the server derives it from start_date.
 */
class BudgetRequest extends FormRequest
{
    use HasMoneyRules;

    /**
     * @return array<string, array<int, ValidationRule|Enum|string>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'spending_limit' => $this->moneyRules(allowZero: true),
            'frequency' => ['required', Rule::enum(AllowanceFrequency::class)],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'required_if:frequency,custom', 'date_format:Y-m-d', 'after_or_equal:start_date', 'before_or_equal:'.$this->maxEndDate()],
            'category_limits' => ['nullable', 'array', 'max:30'],
            'category_limits.*.category_id' => ['required', 'integer', 'distinct', new SelectableCategory($this->user(), CategoryType::Expense)],
            'category_limits.*.limit_amount' => [...$this->moneyRules(allowZero: true), 'lte:spending_limit'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_limits.*.limit_amount.lte' => 'A category limit cannot be larger than the whole budget.',
            'category_limits.*.category_id.distinct' => 'Each category can only have one limit.',
        ];
    }

    /**
     * The money assigned to categories cannot add up to more than the budget itself:
     * students split their period's money across categories, they cannot invent more.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $budget = Money::of((string) $this->input('spending_limit'));
                $limits = $this->input('category_limits');

                if (is_array($limits)) {
                    $assigned = array_reduce(
                        $limits,
                        fn (BigDecimal $sum, mixed $row) => $sum->plus(Money::of((string) ($row['limit_amount'] ?? '0'))),
                        Money::zero(),
                    );

                    if ($assigned->isGreaterThan($budget)) {
                        $validator->errors()->add(
                            'category_limits',
                            'Your categories add up to '.Money::format($assigned).', more than this budget ('.Money::format($budget).'). Lower a category or raise the budget.',
                        );
                    }

                    return;
                }

                // Changing only the amount keeps the saved categories, so it cannot drop below them.
                // Someone else's id is not found here and becomes a 404 in the controller.
                $saved = $this->route('budget') === null ? null : $this->user()?->budgets()->find($this->route('budget'));
                if ($saved === null) {
                    return;
                }

                $assigned = Money::of((string) $saved->categoryLimits()->sum('limit_amount'));

                if ($assigned->isGreaterThan($budget)) {
                    $validator->errors()->add(
                        'spending_limit',
                        'Your categories already use '.Money::format($assigned).'. Enter at least that much, or lower a category first.',
                    );
                }
            },
        ];
    }

    /** Budgets are capped at one year so a typo cannot create a decade-long period. */
    private function maxEndDate(): string
    {
        $start = strtotime((string) $this->input('start_date')) ?: time();

        return date('Y-m-d', strtotime('+1 year', $start) ?: $start);
    }
}
