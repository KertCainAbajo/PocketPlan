<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\CategoryType;
use App\Enums\RecurrenceFrequency;
use App\Http\Requests\Concerns\HasMoneyRules;
use App\Rules\SelectableCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreRecurringIncomeRequest extends FormRequest
{
    use HasMoneyRules;

    /**
     * @return array<string, array<int, ValidationRule|Enum|string>>
     */
    public function rules(): array
    {
        $today = $this->user()->today();

        return [
            'category_id' => ['required', 'integer', new SelectableCategory($this->user(), CategoryType::Income)],
            'amount' => $this->moneyRules(),
            'description' => ['required', 'string', 'max:150'],
            'frequency' => ['required', Rule::enum(RecurrenceFrequency::class)],
            // Backdating is limited so a mistake cannot create years of payments.
            'start_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:'.$today->copy()->subYear()->toDateString(), 'before_or_equal:'.$today->copy()->addYear()->toDateString()],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ];
    }
}
