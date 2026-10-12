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
        // On update the account's own name is not a duplicate of itself.
        $unique = Rule::unique('accounts', 'name')->where('user_id', $this->user()->id);
        if ($this->route('account') !== null) {
            $unique->ignore((int) $this->route('account'));
        }

        return [
            'name' => ['required', 'string', 'max:60', $unique],
            'type' => ['required', Rule::in(['cash', 'bank', 'wallet'])],
            'opening_balance' => ['sometimes', 'required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.config('pocketplan.max_amount')],
        ];
    }
}
