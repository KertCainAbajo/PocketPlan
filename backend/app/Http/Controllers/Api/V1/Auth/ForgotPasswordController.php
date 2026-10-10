<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\SendPasswordResetLink;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\ForgotPasswordRequest;
use Illuminate\Http\JsonResponse;

class ForgotPasswordController extends Controller
{
    public function __invoke(ForgotPasswordRequest $request, SendPasswordResetLink $sendLink): JsonResponse
    {
        $sendLink->handle($request->string('email')->toString());

        // Identical response whether or not the account exists.
        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }
}
