<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Contracts\Validation\Rule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends FormRequest
{
    use NormalizesEmail;

    /**
     * @return array<string, array<int, Rule|ValidationRule|string>>
     */
    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }
}
