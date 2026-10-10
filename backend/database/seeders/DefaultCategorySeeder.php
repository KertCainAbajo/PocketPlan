<?php

namespace Database\Seeders;

use App\Models\ExpenseCategory;
use Illuminate\Database\Seeder;

class DefaultCategorySeeder extends Seeder
{
    /** Icon names are lucide-react-native icon identifiers. */
    public const CATEGORIES = [
        ['name' => 'Food', 'icon' => 'utensils', 'description' => 'Meals, snacks and drinks'],
        ['name' => 'Transportation', 'icon' => 'bus', 'description' => 'Jeepney, bus, train, ride-hailing and fuel'],
        ['name' => 'School Supplies', 'icon' => 'pencil', 'description' => 'Notebooks, pens, printing and photocopies'],
        ['name' => 'School Projects', 'icon' => 'folder-kanban', 'description' => 'Materials and fees for school projects'],
        ['name' => 'Entertainment', 'icon' => 'clapperboard', 'description' => 'Movies, games and outings'],
        ['name' => 'Personal Care', 'icon' => 'sparkles', 'description' => 'Toiletries, haircuts and health items'],
        ['name' => 'Shopping', 'icon' => 'shopping-bag', 'description' => 'Clothes and other purchases'],
        ['name' => 'Bills and Subscriptions', 'icon' => 'receipt', 'description' => 'Load, internet, streaming and other recurring bills'],
        ['name' => 'Other', 'icon' => 'circle-ellipsis', 'description' => 'Anything that does not fit another category'],
    ];

    public function run(): void
    {
        foreach (self::CATEGORIES as $category) {
            ExpenseCategory::query()->whereNull('user_id')->firstOrCreate(
                ['name' => $category['name']],
                ['icon' => $category['icon'], 'description' => $category['description']],
            );
        }
    }
}
