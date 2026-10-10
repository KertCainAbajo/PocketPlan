<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property bool $daily_warning
 * @property bool $threshold_alert
 * @property bool $budget_ending
 * @property bool $budget_completed
 * @property bool $daily_reminder
 * @property string $reminder_time HH:MM:SS in the user's timezone
 * @property int $warning_threshold_percent "Watch Your Spending" starts at this % of the daily target
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class NotificationPreference extends Model
{
    protected $fillable = [
        'daily_warning',
        'threshold_alert',
        'budget_ending',
        'budget_completed',
        'daily_reminder',
        'reminder_time',
        'warning_threshold_percent',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'daily_warning' => true,
        'threshold_alert' => true,
        'budget_ending' => true,
        'budget_completed' => true,
        'daily_reminder' => false,
        'reminder_time' => '20:00:00',
        'warning_threshold_percent' => 80,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'daily_warning' => 'boolean',
            'threshold_alert' => 'boolean',
            'budget_ending' => 'boolean',
            'budget_completed' => 'boolean',
            'daily_reminder' => 'boolean',
            'warning_threshold_percent' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
