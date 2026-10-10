<?php

namespace App\Console\Commands;

use App\Actions\CreateAdminAccount;
use Illuminate\Console\Command;
use Illuminate\Validation\ValidationException;

class CreateAdmin extends Command
{
    protected $signature = 'pocketplan:create-admin
                            {--name= : Admin display name (default: ADMIN_NAME)}
                            {--email= : Admin email (default: ADMIN_EMAIL)}';

    protected $description = 'Create a PocketPlan admin account. The password is read from ADMIN_PASSWORD or prompted for.';

    public function handle(CreateAdminAccount $createAdmin): int
    {
        $name = $this->option('name') ?: config('pocketplan.admin.name');
        $email = $this->option('email') ?: config('pocketplan.admin.email');
        $password = config('pocketplan.admin.password');

        if (! $email) {
            $email = $this->ask('Admin email');
        }

        if (! $password) {
            if (! $this->input->isInteractive()) {
                $this->error('ADMIN_PASSWORD is not set and the command is running non-interactively.');

                return self::FAILURE;
            }
            $password = $this->secret('Initial password (min 12 chars, upper+lower case and a number)');
        }

        try {
            $admin = $createAdmin->handle((string) $name, (string) $email, (string) $password);
        } catch (ValidationException $e) {
            foreach ($e->errors() as $messages) {
                foreach ($messages as $message) {
                    $this->error($message);
                }
            }

            return self::FAILURE;
        }

        $this->info("Admin {$admin->email} created. They must change the password at first login.");
        $this->warn('Remove ADMIN_PASSWORD from .env now that the account exists.');

        return self::SUCCESS;
    }
}
