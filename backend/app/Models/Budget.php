<?php

namespace App\Models;

use App\Enums\AllowanceFrequency;
use App\Enums\BudgetStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Budget extends Model
{
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

    protected $attributes = [
        'savings_target' => '0.00',
        'status' => 'active',
    ];

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function isActive(): bool
    {
        return $this->status === BudgetStatus::Active;
    }
}
