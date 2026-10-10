<?php

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Concerns\NormalizesEmail;
use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    use NormalizesEmail;

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
        ];
    }
}
