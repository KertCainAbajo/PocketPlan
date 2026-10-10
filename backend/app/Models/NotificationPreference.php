<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    protected $attributes = [
        'daily_warning' => true,
        'threshold_alert' => true,
        'budget_ending' => true,
        'budget_completed' => true,
        'daily_reminder' => false,
        'reminder_time' => '20:00:00',
        'warning_threshold_percent' => 80,
    ];

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
