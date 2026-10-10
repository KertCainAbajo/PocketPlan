<?php

namespace Database\Factories;

use App\Enums\RecurrenceFrequency;
use App\Models\Category;
use App\Models\RecurringIncome;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RecurringIncome>
 */
class RecurringIncomeFactory extends Factory
{
    /**
     * A weekly ₱2,000 allowance starting today, nothing generated yet.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $today = now('Asia/Manila')->toDateString();

        return [
            'user_id' => User::factory(),
            'category_id' => Category::factory()->income(),
            'amount' => '2000.00',
            'description' => 'Weekly allowance',
            'frequency' => RecurrenceFrequency::Weekly,
            'start_date' => $today,
            'end_date' => null,
            'next_due_on' => $today,
            'occurrences_generated' => 0,
            'is_active' => true,
        ];
    }
}
