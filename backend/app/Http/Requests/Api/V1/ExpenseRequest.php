<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\CategoryType;
use App\Enums\PaymentMethod;
use App\Http\Requests\Concerns\HasMoneyRules;
use App\Rules\SelectableCategory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/** Create (POST) and full update (PUT) of an expense. */
class ExpenseRequest extends FormRequest
{
    use HasMoneyRules;

    /**
     * @return array<string, array<int, ValidationRule|Enum|string>>
     */
    public function rules(): array
    {
        $current = $this->route('expense')
            ? $this->user()->expenses()->find($this->route('expense'))?->category_id
            : null;

        return [
            'account_id' => ['nullable', 'integer', Rule::exists('accounts', 'id')->where('user_id', $this->user()->id)],
            'category_id' => ['required', 'integer', new SelectableCategory($this->user(), CategoryType::Expense, $current)],
            'amount' => $this->moneyRules(),
            'description' => ['required', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'payment_method' => ['nullable', Rule::enum(PaymentMethod::class)],
            'spent_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:'.$this->userToday()],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['spent_on.before_or_equal' => 'Expenses cannot be dated in the future.'];
    }
}
