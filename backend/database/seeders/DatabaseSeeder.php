<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Safe to run repeatedly: every seeder is idempotent. */
    public function run(): void
    {
        $this->call([
            DefaultCategorySeeder::class,
            AdminAccountSeeder::class,
        ]);
    }
}
