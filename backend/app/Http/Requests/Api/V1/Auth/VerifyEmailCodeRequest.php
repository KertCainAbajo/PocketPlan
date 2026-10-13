<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;

/** Check an emailed code; name and terms are only needed for a new account. */
class VerifyEmailCodeRequest extends FormRequest
{
    use NormalizesEmail;

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            'code' => ['required', 'string', 'digits:6'],
            'name' => ['nullable', 'string', 'max:100'],
            'terms' => ['nullable', 'boolean'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }
}
