<?php

namespace App\Models;

use Database\Factories\IncomeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Money actually received.
 *
 * @property int $id
 * @property int $user_id
 * @property int $category_id
 * @property int|null $recurring_income_id set when generated from a schedule
 * @property string $amount
 * @property string $description
 * @property string|null $notes
 * @property Carbon $received_on
 * @property string|null $received_time optional time of day (HH:MM:SS)
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Income extends Model
{
    /** @use HasFactory<IncomeFactory> */
    use HasFactory;

    /** user_id and recurring_income_id are assigned by the server. */
    protected $fillable = [
        'account_id',
        'category_id',
        'amount',
        'description',
        'notes',
        'received_on',
        'received_time',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'received_on' => 'date',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return BelongsTo<RecurringIncome, $this> */
    public function recurringIncome(): BelongsTo
    {
        return $this->belongsTo(RecurringIncome::class);
    }
}
