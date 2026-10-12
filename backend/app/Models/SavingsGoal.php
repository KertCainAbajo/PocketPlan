<?php

namespace App\Models;

use App\Enums\SavingsGoalStatus;
use Database\Factories\SavingsGoalFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $icon
 * @property string $target_amount
 * @property Carbon|null $target_date
 * @property bool $reminder_enabled
 * @property SavingsGoalStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SavingsGoal extends Model
{
    /** @use HasFactory<SavingsGoalFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'icon',
        'target_amount',
        'target_date',
        'reminder_enabled',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'status' => 'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'target_amount' => 'decimal:2',
            'target_date' => 'date',
            'reminder_enabled' => 'boolean',
            'status' => SavingsGoalStatus::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<SavingsContribution, $this> */
    public function contributions(): HasMany
    {
        return $this->hasMany(SavingsContribution::class);
    }
}
