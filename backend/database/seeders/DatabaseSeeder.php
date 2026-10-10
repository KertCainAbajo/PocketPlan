<?php

namespace Database\Seeders;

use App\Actions\CreateAdminAccount;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DefaultCategorySeeder::class);

        $email = config('pocketplan.admin.email');
        $password = config('pocketplan.admin.password');

        if ($email && $password && ! User::where('email', strtolower($email))->exists()) {
            app(CreateAdminAccount::class)->handle(config('pocketplan.admin.name'), $email, $password);
            $this->command?->info("Admin {$email} created from ADMIN_* environment variables.");
        } elseif (! $email || ! $password) {
            $this->command?->warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created. Run `php artisan pocketplan:create-admin`.');
        }
    }
}
