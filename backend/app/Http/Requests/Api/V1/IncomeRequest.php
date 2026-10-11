<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\CategoryType;
use App\Http\Requests\Concerns\HasMoneyRules;
use App\Rules\SelectableCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Create (POST) and full update (PUT) of an income record. */
class IncomeRequest extends FormRequest
{
    use HasMoneyRules;

    /**
     * @return array<string, array<int, ValidationRule|string>>
     */
    public function rules(): array
    {
        $current = $this->route('income')
            ? $this->user()->incomes()->find($this->route('income'))?->category_id
            : null;

        return [
            'account_id' => ['nullable', 'integer', Rule::exists('accounts', 'id')->where('user_id', $this->user()->id)],
            'category_id' => ['required', 'integer', new SelectableCategory($this->user(), CategoryType::Income, $current)],
            'amount' => $this->moneyRules(),
            'description' => ['required', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'received_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.$this->userToday()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['received_on.before_or_equal' => 'Income cannot be dated in the future. Use a recurring schedule for upcoming payments.'];
    }
}
