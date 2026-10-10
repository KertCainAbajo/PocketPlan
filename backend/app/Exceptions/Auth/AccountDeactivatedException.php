<?php

namespace App\Exceptions\Auth;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/** The account exists but an admin has deactivated it. */
class AccountDeactivatedException extends RuntimeException
{
    public const MESSAGE = 'This account has been deactivated.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 403);
    }
}
