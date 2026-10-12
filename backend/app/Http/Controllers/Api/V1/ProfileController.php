<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use App\Models\SavingsContribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
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
            'timezone' => ['sometimes', 'required', 'string', 'timezone:all'],
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

    /**
     * Permanently deletes the student and everything they recorded.
     * Children are removed explicitly, in dependency order, because several
     * tables restrict deleting a category that transactions still use.
     */
    public function destroy(Request $request): Response
    {
        $input = $request->validate(['current_password' => ['required', 'string']]);
        $user = $request->user();
        if (! Hash::check($input['current_password'], $user->password)) {
            throw ValidationException::withMessages(['current_password' => ['Your password is incorrect.']]);
        }

        DB::transaction(function () use ($user) {
            $user->expenses()->delete();
            $user->incomes()->delete();
            $user->recurringIncomes()->delete();
            $user->budgetRollovers()->delete();
            $user->budgets()->delete();
            SavingsContribution::query()->where('user_id', $user->id)->delete();
            $user->savingsGoals()->delete();
            $user->accounts()->delete();
            $user->personalCategories()->delete();
            $user->notificationPreference()->delete();
            $user->tokens()->delete();
            $user->delete();
        });

        return response()->noContent();
    }
}
