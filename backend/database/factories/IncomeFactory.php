<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Income;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Income>
 */
class IncomeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'category_id' => Category::factory()->income(),
            'recurring_income_id' => null,
            'amount' => '2000.00',
            'description' => 'Weekly allowance',
            'notes' => null,
            'received_on' => now('Asia/Manila')->toDateString(),
        ];
    }
}
