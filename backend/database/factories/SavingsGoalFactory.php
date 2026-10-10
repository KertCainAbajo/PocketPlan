<?php

namespace Database\Factories;

use App\Enums\SavingsGoalStatus;
use App\Models\SavingsGoal;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SavingsGoal>
 */
class SavingsGoalFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => 'New phone',
            'target_amount' => '5000.00',
            'target_date' => null,
            'status' => SavingsGoalStatus::Active,
        ];
    }
}
