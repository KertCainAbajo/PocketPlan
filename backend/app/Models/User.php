<?php

namespace App\Models;

use App\Enums\DeactivatedBy;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $password
 * @property UserRole $role
 * @property UserStatus $status
 * @property string $currency ISO 4217 code, e.g. PHP
 * @property string $timezone IANA zone used to decide what "today" is
 * @property bool $must_change_password
 * @property Carbon|null $email_verified_at
 * @property Carbon|null $onboarded_at
 * @property Carbon|null $last_login_at
 * @property Carbon|null $deactivated_at
 * @property DeactivatedBy|null $deactivated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * role and status are deliberately NOT fillable: they can only be changed
     * through explicit forceFill() calls in trusted server code.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'currency',
        'timezone',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'role' => 'student',
        'status' => 'active',
        'currency' => 'PHP',
        'timezone' => 'Asia/Manila',
        'must_change_password' => false,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'onboarded_at' => 'datetime',
            'last_login_at' => 'datetime',
            'deactivated_at' => 'datetime',
            'must_change_password' => 'boolean',
            'password' => 'hashed',
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'deactivated_by' => DeactivatedBy::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isStudent(): bool
    {
        return $this->role === UserRole::Student;
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /**
     * Today's calendar date for this user, decided in their own timezone.
     *
     * Returned at midnight in the application timezone, the same form as DATE
     * columns (spent_on, start_date…), so the two can be compared directly.
     * Comparing against a Manila-midnight instant instead would be 8 hours off.
     */
    public function today(): Carbon
    {
        return Carbon::parse(Carbon::now($this->timezone)->toDateString(), config('app.timezone'));
    }

    /** @return HasMany<Budget, $this> */
    public function budgets(): HasMany
    {
        return $this->hasMany(Budget::class);
    }

    /** @return HasMany<Expense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /** @return HasMany<Income, $this> */
    public function incomes(): HasMany
    {
        return $this->hasMany(Income::class);
    }

    /** @return HasMany<RecurringIncome, $this> */
    public function recurringIncomes(): HasMany
    {
        return $this->hasMany(RecurringIncome::class);
    }

    /**
     * The student's own categories (platform defaults have no owner).
     *
     * @return HasMany<Category, $this>
     */
    public function personalCategories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /** @return HasMany<SavingsGoal, $this> */
    public function savingsGoals(): HasMany
    {
        return $this->hasMany(SavingsGoal::class);
    }

    /** @return HasOne<NotificationPreference, $this> */
    public function notificationPreference(): HasOne
    {
        return $this->hasOne(NotificationPreference::class);
    }

    /** @return HasMany<AdminAuditLog, $this> */
    public function auditLogs(): HasMany
    {
        return $this->hasMany(AdminAuditLog::class, 'admin_id');
    }
}
