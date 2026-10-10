<?php

namespace Database\Factories;

use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseCategory>
 */
class ExpenseCategoryFactory extends Factory
{
    /**
     * A default (admin-managed) category. Use forUser() for a personal one.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'name' => ucfirst(fake()->unique()->word()),
            'description' => fake()->sentence(),
            'icon' => 'circle',
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
