<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\IssueMobileToken;
use App\Actions\Auth\SendEmailLoginCode;
use App\Actions\Auth\VerifyEmailLoginCode;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\EmailCodeRequest;
use App\Http\Requests\Api\V1\Auth\VerifyEmailCodeRequest;
use App\Http\Resources\V1\AuthTokenResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/** Passwordless sign-in and sign-up with a 6-digit code sent by email. */
class EmailCodeController extends Controller
{
    /**
     * Sign-in only sends a code to emails that have an account, and sign-up only
     * to new ones. The reply's `reason` lets the app offer the other screen.
     */
    public function send(EmailCodeRequest $request, SendEmailLoginCode $send): JsonResponse
    {
        $email = $request->string('email')->toString();
        $intent = $request->input('intent');
        $exists = $intent !== null && User::query()->where('email', $email)->exists();

        if ($intent === 'signin' && ! $exists) {
            return $this->mismatch('no_account', 'No PocketPlan account uses this email. Create an account first.');
        }
        if ($intent === 'signup' && $exists) {
            return $this->mismatch('account_exists', 'This email already has a PocketPlan account. Sign in instead.');
        }

        $send->handle($email);

        return response()->json([
            'message' => 'We sent a 6-digit code to your email.',
            'resend_seconds' => (int) config('pocketplan.email_code.resend_seconds'),
        ]);
    }

    private function mismatch(string $reason, string $message): JsonResponse
    {
        return response()->json(['message' => $message, 'reason' => $reason, 'errors' => ['email' => [$message]]], 422);
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
