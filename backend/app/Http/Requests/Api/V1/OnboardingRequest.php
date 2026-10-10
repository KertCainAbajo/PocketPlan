<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\AllowanceFrequency;
use App\Http\Requests\Concerns\HasMoneyRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Rules\In;

class OnboardingRequest extends FormRequest
{
    use HasMoneyRules;

    /**
     * @return array<string, array<int, ValidationRule|Enum|In|string>>
     */
    public function rules(): array
    {
        $today = $this->user()->today();

        return [
            'currency' => ['required', 'string', Rule::in(config('pocketplan.currencies'))],
            'allowance_amount' => $this->moneyRules(),
            'frequency' => ['required', Rule::enum(AllowanceFrequency::class)],
            'start_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:'.$today->copy()->subMonth()->toDateString(), 'before_or_equal:'.$today->copy()->addMonth()->toDateString()],
            'end_date' => ['nullable', 'required_if:frequency,custom', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'recurring' => ['sometimes', 'boolean'],
            'savings_goal' => ['nullable', 'array'],
            'savings_goal.name' => ['required_with:savings_goal', 'string', 'max:100'],
            'savings_goal.target_amount' => ['required_with:savings_goal', ...array_slice($this->moneyRules(), 1)],
            'savings_goal.target_date' => ['nullable', 'date_format:Y-m-d', 'after:'.$today->toDateString()],
        ];
    }
}
