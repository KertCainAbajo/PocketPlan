<?php

namespace Tests\Concerns;

use App\Enums\CategoryType;
use App\Models\Category;
use App\Models\User;
use Carbon\CarbonImmutable;
use Database\Seeders\DefaultCategorySeeder;
use Laravel\Sanctum\Sanctum;

/**
 * Helpers for API tests that act as a signed-in student at a fixed date.
 */
trait InteractsWithStudents
{
    /** Wednesday 7 Oct 2026, 10:00 in Manila. */
    protected const TODAY = '2026-10-07';

    protected function freezeToday(string $date = self::TODAY, string $time = '10:00:00'): CarbonImmutable
    {
        $now = CarbonImmutable::parse("{$date} {$time}", 'Asia/Manila');
        $this->travelTo($now);

        return $now;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function actingAsStudent(array $attributes = []): User
    {
        $user = User::factory()->onboarded()->create($attributes);
        $user->notificationPreference()->create();
        Sanctum::actingAs($user);

        return $user;
    }

    protected function seedCategories(): void
    {
        $this->seed(DefaultCategorySeeder::class);
    }

    protected function defaultCategory(string $name, CategoryType $type = CategoryType::Expense): Category
    {
        return Category::query()->defaults()->where('type', $type)->where('name', $name)->firstOrFail();
    }
}
