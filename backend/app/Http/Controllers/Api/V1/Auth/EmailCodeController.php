<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\IssueMobileToken;
use App\Actions\Auth\SendEmailLoginCode;
use App\Actions\Auth\VerifyEmailLoginCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\EmailCodeRequest;
use App\Http\Requests\Api\V1\Auth\VerifyEmailCodeRequest;
use App\Http\Resources\V1\AuthTokenResource;
use Illuminate\Http\JsonResponse;

/** Passwordless sign-in and sign-up with a 6-digit code sent by email. */
class EmailCodeController extends Controller
{
    public function send(EmailCodeRequest $request, SendEmailLoginCode $send): JsonResponse
    {
        $send->handle($request->string('email')->toString());

        return response()->json([
            'message' => 'We sent a 6-digit code to your email.',
            'resend_seconds' => (int) config('pocketplan.email_code.resend_seconds'),
        ]);
    }

    /**
     * 200 + token for an existing student, 201 + token for a new account, or
     * 200 with needs_name when the email is new and no name was sent yet.
     */
    public function verify(VerifyEmailCodeRequest $request, VerifyEmailLoginCode $verify, IssueMobileToken $issueToken): JsonResponse
    {
        $result = $verify->handle(
            $request->string('email')->toString(),
            $request->string('code')->toString(),
            $request->input('name'),
            $request->boolean('terms'),
        );

        if ($result['needs_name']) {
            return response()->json(['data' => ['needs_name' => true]]);
        }

        $user = $result['user'];

        return (new AuthTokenResource($issueToken->handle($user, $request->input('device_name')), $user))
            ->response()
            ->setStatusCode($result['created'] ? 201 : 200);
    }
}
