<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Actions\Auth\IssueMobileToken;
use App\Actions\Auth\RegisterStudent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Auth\RegisterRequest;
use App\Http\Resources\V1\AuthTokenResource;
use Illuminate\Http\JsonResponse;

class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request, RegisterStudent $register, IssueMobileToken $issueToken): JsonResponse
    {
        $user = $register->handle(
            $request->string('name')->toString(),
            $request->string('email')->toString(),
            $request->string('password')->toString(),
        );

        return (new AuthTokenResource($issueToken->handle($user, $request->input('device_name')), $user))
            ->response()
            ->setStatusCode(201);
    }
}
