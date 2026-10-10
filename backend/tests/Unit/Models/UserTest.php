<?php

namespace Tests\Unit\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class UserTest extends TestCase
{
    public function test_role_cannot_be_mass_assigned(): void
    {
        $this->expectException(MassAssignmentException::class);

        new User(['name' => 'Eve', 'email' => 'eve@example.com', 'role' => 'admin']);
    }

    public function test_status_cannot_be_mass_assigned(): void
    {
        $this->expectException(MassAssignmentException::class);

        new User(['name' => 'Eve', 'email' => 'eve@example.com', 'status' => 'active']);
    }

    public function test_new_users_default_to_active_students_in_manila(): void
    {
        $user = new User;

        $this->assertSame(UserRole::Student, $user->role);
        $this->assertSame(UserStatus::Active, $user->status);
        $this->assertSame('PHP', $user->currency);
        $this->assertSame('Asia/Manila', $user->timezone);
    }

    public function test_today_uses_the_users_timezone(): void
    {
        // 23:30 UTC on Oct 10 is already Oct 11 in Manila (UTC+8).
        Carbon::setTestNow(Carbon::parse('2026-10-10 23:30:00', 'UTC'));

        $this->assertSame('2026-10-11', (new User(['timezone' => 'Asia/Manila']))->today()->toDateString());
        $this->assertSame('2026-10-10', (new User(['timezone' => 'UTC']))->today()->toDateString());

        Carbon::setTestNow();
    }

    public function test_password_is_hidden_from_serialisation(): void
    {
        $user = new User(['name' => 'Juan', 'email' => 'juan@example.com', 'password' => 'secret123']);

        $this->assertArrayNotHasKey('password', $user->toArray());
    }
}
