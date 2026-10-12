<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function update(Request $request): UserResource
    {
        $user = $request->user();
        $input = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'currency' => ['required', 'string', Rule::in(config('pocketplan.currencies'))],
        ]);
        if ($input['email'] !== $user->email) {
            $user->forceFill(['email_verified_at' => null]);
        }
        $user->fill($input)->save();

        return new UserResource($user->refresh());
    }

    public function changePassword(Request $request): JsonResponse
    {
        $input = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);
        if (! Hash::check($input['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages(['current_password' => ['Your current password is incorrect.']]);
        }
        $request->user()->forceFill(['password' => $input['password']])->save();

        return response()->json(['message' => 'Your password has been updated.']);
    }

    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $request->user()->tokens()->whereKeyNot($request->user()->currentAccessToken()->getKey())->delete();

        return response()->json(['message' => 'Other signed-in devices have been signed out.']);
    }
}
