<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    /**
     * An unbudgeted expense dated today. Pass budget_id explicitly when needed.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'budget_id' => null,
            'category_id' => Category::factory(),
            'amount' => number_format(fake()->randomFloat(2, 10, 500), 2, '.', ''),
            'description' => fake()->words(3, true),
            'notes' => null,
            'payment_method' => null,
            'spent_on' => now('Asia/Manila')->toDateString(),
        ];
    }
}
