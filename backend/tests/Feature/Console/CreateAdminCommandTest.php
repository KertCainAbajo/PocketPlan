<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_admin_from_environment_config(): void
    {
        config([
            'pocketplan.admin.name' => 'Site Admin',
            'pocketplan.admin.email' => 'Admin@PocketPlan.test',
            'pocketplan.admin.password' => 'Initial-Pass-2026',
        ]);

        $this->artisan('pocketplan:create-admin')->assertSuccessful();

        $admin = User::firstWhere('email', 'admin@pocketplan.test');
        $this->assertTrue($admin->isAdmin());
        $this->assertTrue($admin->isActive());
        $this->assertTrue($admin->must_change_password);
        $this->assertTrue(Hash::check('Initial-Pass-2026', $admin->password));
    }

    public function test_rejects_weak_password(): void
    {
        config([
            'pocketplan.admin.email' => 'admin@pocketplan.test',
            'pocketplan.admin.password' => 'password',
        ]);

        $this->artisan('pocketplan:create-admin')->assertFailed();
        $this->assertSame(0, User::count());
    }

    public function test_rejects_existing_email(): void
    {
        User::factory()->create(['email' => 'admin@pocketplan.test']);
        config([
            'pocketplan.admin.email' => 'admin@pocketplan.test',
            'pocketplan.admin.password' => 'Initial-Pass-2026',
        ]);

        $this->artisan('pocketplan:create-admin')->assertFailed();
        $this->assertSame(0, User::where('role', 'admin')->count());
    }

    public function test_fails_without_password_when_not_interactive(): void
    {
        config(['pocketplan.admin.email' => 'admin@pocketplan.test', 'pocketplan.admin.password' => null]);

        $this->artisan('pocketplan:create-admin', ['--no-interaction' => true])->assertFailed();
    }

    public function test_seeder_creates_default_categories_and_admin(): void
    {
        config([
            'pocketplan.admin.email' => 'admin@pocketplan.test',
            'pocketplan.admin.password' => 'Initial-Pass-2026',
        ]);

        $this->seed();
        $this->seed(); // idempotent

        $this->assertDatabaseCount('categories', 16); // 9 expense + 7 income defaults
        $this->assertSame(1, User::where('role', 'admin')->count());
    }
}
