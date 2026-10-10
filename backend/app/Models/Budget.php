<?php

namespace App\Models;

use App\Enums\AllowanceFrequency;
use App\Enums\BudgetStatus;
use Database\Factories\BudgetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * An allowance period. Money columns are DECIMAL and arrive as strings ("2000.00").
 *
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $total_allowance
 * @property string $savings_target amount reserved for savings; not spendable
 * @property Carbon $start_date
 * @property Carbon $end_date inclusive
 * @property AllowanceFrequency $frequency
 * @property BudgetStatus $status
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Budget extends Model
{
    /** @use HasFactory<BudgetFactory> */
    use HasFactory;

    /** user_id and status are assigned by the server, never mass-assigned. */
    protected $fillable = [
        'name',
        'total_allowance',
        'savings_target',
        'start_date',
        'end_date',
        'frequency',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'savings_target' => '0.00',
        'status' => 'active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'total_allowance' => 'decimal:2',
            'savings_target' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'completed_at' => 'datetime',
            'frequency' => AllowanceFrequency::class,
            'status' => BudgetStatus::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<Expense, $this> */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function isActive(): bool
    {
        return $this->status === BudgetStatus::Active;
    }
}
