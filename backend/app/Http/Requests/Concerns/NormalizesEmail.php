<?php

namespace App\Http\Requests\Concerns;

/**
 * Lower-cases and trims the email before validation so "Juan@Example.com "
 * and "juan@example.com" are the same account.
 */
trait NormalizesEmail
{
    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => mb_strtolower(trim((string) $this->input('email')))]);
        }
    }
}
