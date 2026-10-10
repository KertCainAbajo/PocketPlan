<?php

namespace Database\Factories;

use App\Enums\CategoryType;
use App\Models\Category;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A platform-default expense category. Use income(), forUser() or inactive() to vary it.
 *
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'type' => CategoryType::Expense,
            'name' => ucfirst(fake()->unique()->word()).' '.fake()->unique()->numberBetween(1, 99999),
            'description' => fake()->sentence(),
            'icon' => 'circle',
            'is_active' => true,
        ];
    }

    public function income(): static
    {
        return $this->state(fn () => ['type' => CategoryType::Income]);
    }

    public function forUser(User $user): static
    {
        return $this->state(fn () => ['user_id' => $user->id]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
