<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\ResetStudentPassword;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;

class ResetPasswordController extends Controller
{
    public function __invoke(ResetPasswordRequest $request, ResetStudentPassword $resetPassword): JsonResponse
    {
        $resetPassword->handle(
            $request->string('email')->toString(),
            $request->string('token')->toString(),
            $request->string('password')->toString(),
        );

        return response()->json(['message' => 'Your password has been reset. Please sign in.']);
    }
}
