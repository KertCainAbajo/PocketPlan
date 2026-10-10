<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * The request is valid but conflicts with the current state
 * (overlapping budget, budget already completed, already onboarded…). HTTP 409.
 */
class ConflictException extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $details
     */
    public function __construct(string $message, private readonly array $details = [])
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json(array_filter([
            'message' => $this->getMessage(),
            'details' => $this->details ?: null,
        ]), 409);
    }
}
