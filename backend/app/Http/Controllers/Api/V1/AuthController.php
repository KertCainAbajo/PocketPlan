<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Requests\Api\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = new User($request->safe()->only(['name', 'email', 'password']));
            // Public registration always creates a student, whatever the client sends.
            $user->forceFill(['role' => UserRole::Student, 'status' => UserStatus::Active, 'last_login_at' => now()]);
            $user->save();
            $user->notificationPreference()->create();

            return $user;
        });

        return response()->json([
            'data' => [
                'token' => $this->issueToken($user, $request->input('device_name')),
                'user' => new UserResource($user),
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->validated('email'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if (! $user->isStudent()) {
            return response()->json(['message' => 'Admin accounts must sign in through the admin dashboard.'], 403);
        }

        if (! $user->isActive()) {
            return response()->json(['message' => 'This account has been deactivated.'], 403);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return response()->json([
            'data' => [
                'token' => $this->issueToken($user, $request->validated('device_name')),
                'user' => new UserResource($user),
            ],
        ]);
    }

    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        $email = strtolower(trim($request->input('email')));

        // Only active students reset through the mobile flow. The response is
        // identical either way so the endpoint cannot be used to discover accounts.
        $user = User::where('email', $email)->first();
        if ($user?->isStudent() && $user->isActive()) {
            Password::sendResetLink(['email' => $email]);
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            [
                'email' => strtolower(trim($request->input('email'))),
                'password' => $request->input('password'),
                'password_confirmation' => $request->input('password_confirmation'),
                'token' => $request->input('token'),
            ],
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                // A reset signs the account out of every device.
                $user->tokens()->delete();
                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return response()->json(['message' => 'Your password has been reset. Please sign in.']);
    }

    private function issueToken(User $user, ?string $deviceName): string
    {
        return $user->createToken(
            'mobile:'.($deviceName ?: 'unknown-device'),
            ['*'],
            now()->addDays(config('pocketplan.token_ttl_days')),
        )->plainTextToken;
    }
}
