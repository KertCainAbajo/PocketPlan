<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * An active student by default. Factories bypass mass-assignment protection,
 * so role and status can be set through states.
 *
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /** Hashed once and reused, because hashing is slow. */
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::Student,
            'status' => UserStatus::Active,
            'remember_token' => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(fn () => ['email_verified_at' => null]);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => UserRole::Admin]);
    }

    public function deactivated(): static
    {
        return $this->state(fn () => [
            'status' => UserStatus::Deactivated,
            'deactivated_at' => now(),
        ]);
    }

    public function onboarded(): static
    {
        return $this->state(fn () => ['onboarded_at' => now()]);
    }
}
