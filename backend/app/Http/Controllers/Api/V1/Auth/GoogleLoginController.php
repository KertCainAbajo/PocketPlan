<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\AuthenticateWithGoogle;
use App\Actions\Auth\IssueMobileToken;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\AuthTokenResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoogleLoginController extends Controller
{
    /** 201 when a new account was created, 200 when an existing one signed in. */
    public function __invoke(Request $request, AuthenticateWithGoogle $google, IssueMobileToken $issueToken): JsonResponse
    {
        $request->validate([
            'id_token' => ['required', 'string', 'max:4096'],
            'terms' => ['sometimes', 'boolean'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ]);

        ['user' => $user, 'created' => $created] = $google->handle(
            $request->string('id_token')->toString(),
            $request->boolean('terms'),
        );

        return (new AuthTokenResource($issueToken->handle($user, $request->input('device_name')), $user))
            ->response()
            ->setStatusCode($created ? 201 : 200);
    }
}
