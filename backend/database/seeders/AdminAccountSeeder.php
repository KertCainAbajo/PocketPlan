<?php

namespace Database\Seeders;

use App\Actions\Admin\CreateAdminAccount;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Creates the initial admin from ADMIN_* environment variables, if they are set
 * and the account does not exist yet. Credentials are never hard-coded.
 */
class AdminAccountSeeder extends Seeder
{
    public function run(CreateAdminAccount $createAdmin): void
    {
        $email = config('pocketplan.admin.email');
        $password = config('pocketplan.admin.password');

        if (! $email || ! $password) {
            $this->command->warn('ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin created. Run `php artisan pocketplan:create-admin`.');

            return;
        }

        if (User::query()->where('email', mb_strtolower(trim($email)))->exists()) {
            return;
        }

        $createAdmin->handle(config('pocketplan.admin.name'), $email, $password);
        $this->command->info("Admin {$email} created from ADMIN_* environment variables.");
    }
}
