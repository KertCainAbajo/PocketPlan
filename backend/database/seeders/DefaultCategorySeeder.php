<?php

namespace Database\Seeders;

use App\Enums\CategoryType;
use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * Platform-default categories. Idempotent: existing defaults are left untouched
 * so admin edits are never overwritten. Icons are lucide-react-native names.
 */
class DefaultCategorySeeder extends Seeder
{
    /** @var array<int, array{name: string, icon: string, description: string}> */
    public const EXPENSE = [
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

    /** @var array<int, array{name: string, icon: string, description: string}> */
    public const INCOME = [
        ['name' => 'Allowance', 'icon' => 'wallet', 'description' => 'Allowance from parents or guardians'],
        ['name' => 'Salary', 'icon' => 'briefcase', 'description' => 'Pay from a part-time or full-time job'],
        ['name' => 'Freelance', 'icon' => 'laptop', 'description' => 'Commissions and freelance work'],
        ['name' => 'Business', 'icon' => 'store', 'description' => 'Income from selling or a small business'],
        ['name' => 'Scholarship', 'icon' => 'graduation-cap', 'description' => 'Scholarship and grant stipends'],
        ['name' => 'Gift', 'icon' => 'gift', 'description' => 'Money received as a gift'],
        ['name' => 'Other Income', 'icon' => 'circle-plus', 'description' => 'Any other money received'],
    ];

    public function run(): void
    {
        $this->seed(CategoryType::Expense, self::EXPENSE);
        $this->seed(CategoryType::Income, self::INCOME);
    }

    /**
     * @param  array<int, array{name: string, icon: string, description: string}>  $categories
     */
    private function seed(CategoryType $type, array $categories): void
    {
        foreach ($categories as $category) {
            $exists = Category::query()->defaults()
                ->where('type', $type)
                ->where('name', $category['name'])
                ->exists();

            if (! $exists) {
                $model = new Category(['name' => $category['name'], 'icon' => $category['icon'], 'description' => $category['description']]);
                $model->type = $type;
                $model->save();
            }
        }
    }
}
