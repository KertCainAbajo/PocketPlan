<?php

namespace App\Exceptions\Auth;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** The mobile API only serves students; admins use the web dashboard. */
class StudentAccountRequiredException extends RuntimeException
{
    public function __construct(string $message = 'This action is only available to student accounts.')
    {
        parent::__construct($message);
    }

    public static function adminLogin(): self
    {
        return new self('Admin accounts must sign in through the admin dashboard.');
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 403);
    }
}
