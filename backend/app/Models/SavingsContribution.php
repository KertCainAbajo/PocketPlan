<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Money moved into (positive) or out of (negative) a savings goal.
 * Contributions are never expenses and never affect budget calculations.
 *
 * @property int $id
 * @property int $savings_goal_id
 * @property int $user_id
 * @property string $amount
 * @property Carbon $contributed_on
 * @property string|null $note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SavingsContribution extends Model
{
    protected $fillable = [
        'amount',
        'contributed_on',
        'note',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'contributed_on' => 'date',
        ];
    }

    /** @return BelongsTo<SavingsGoal, $this> */
    public function goal(): BelongsTo
    {
        return $this->belongsTo(SavingsGoal::class, 'savings_goal_id');
    }
}
