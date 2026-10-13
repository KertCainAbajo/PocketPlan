<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;

/** Ask for a sign-in code to be emailed. */
class EmailCodeRequest extends FormRequest
{
    use NormalizesEmail;

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email', 'max:255'],
            // signin: the email must already have an account; signup: it must not.
            'intent' => ['nullable', 'string', 'in:signin,signup'],
        ];
    }
}
