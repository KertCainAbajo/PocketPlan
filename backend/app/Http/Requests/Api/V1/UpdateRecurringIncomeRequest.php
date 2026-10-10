<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\CategoryType;
use App\Http\Requests\Concerns\HasMoneyRules;
use App\Rules\SelectableCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * start_date and frequency are fixed once a schedule exists (they anchor the
 * payment dates); delete and recreate the schedule to change them.
 */
class UpdateRecurringIncomeRequest extends FormRequest
{
    use HasMoneyRules;

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        $schedule = $this->user()->recurringIncomes()->find($this->route('recurringIncome'));

        return [
            'category_id' => ['required', 'integer', new SelectableCategory($this->user(), CategoryType::Income, $schedule?->category_id)],
            'amount' => $this->moneyRules(),
            'description' => ['required', 'string', 'max:150'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.($schedule?->start_date->toDateString() ?? 'today')],
            'is_active' => ['required', 'boolean'],
        ];
    }
}
