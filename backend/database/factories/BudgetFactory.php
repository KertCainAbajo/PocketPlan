<?php

namespace Database\Factories;

use App\Enums\AllowanceFrequency;
use App\Enums\BudgetStatus;
use App\Models\Budget;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Budget>
 */
class BudgetFactory extends Factory
{
    /**
     * A ₱2,000 weekly budget that started today (Manila time).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = now('Asia/Manila')->startOfDay();

        return [
            'user_id' => User::factory(),
            'name' => 'Weekly allowance',
            'spending_limit' => '2000.00',
            'start_date' => $start->toDateString(),
            'end_date' => $start->copy()->addDays(6)->toDateString(),
            'frequency' => AllowanceFrequency::Weekly,
            'status' => BudgetStatus::Active,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => BudgetStatus::Completed,
            'completed_at' => now(),
        ]);
    }
}
