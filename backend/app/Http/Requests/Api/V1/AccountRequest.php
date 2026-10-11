<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AccountRequest extends FormRequest
{
    /** @return array<string, array<int, string|ValidationRule>> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:60', Rule::unique('accounts', 'name')->where('user_id', $this->user()->id)],
            'type' => ['required', Rule::in(['cash', 'bank', 'wallet'])],
            'opening_balance' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.config('pocketplan.max_amount')],
        ];
    }
}
