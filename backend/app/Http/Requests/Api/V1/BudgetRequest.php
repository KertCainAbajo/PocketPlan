<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\AllowanceFrequency;
use App\Enums\CategoryType;
use App\Http\Requests\Concerns\HasMoneyRules;
use App\Rules\SelectableCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

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

    /** Budgets are capped at one year so a typo cannot create a decade-long period. */
    private function maxEndDate(): string
    {
        $start = strtotime((string) $this->input('start_date')) ?: time();

        return date('Y-m-d', strtotime('+1 year', $start) ?: $start);
    }
}
