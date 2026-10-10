<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\AuthenticateStudent;
use App\Actions\Auth\IssueMobileToken;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\LoginRequest;
use App\Http\Resources\V1\AuthTokenResource;

class LoginController extends Controller
{
    public function __invoke(LoginRequest $request, AuthenticateStudent $authenticate, IssueMobileToken $issueToken): AuthTokenResource
    {
        $user = $authenticate->handle(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
        );

        return new AuthTokenResource($issueToken->handle($user, $request->input('device_name')), $user);
    }
}
