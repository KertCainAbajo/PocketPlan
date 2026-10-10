<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use Database\Factories\ExpenseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $budget_id assigned by the server from spent_on; null = unbudgeted
 * @property int $category_id
 * @property string $amount DECIMAL as string, e.g. "120.50"
 * @property string $description
 * @property string|null $notes
 * @property PaymentMethod|null $payment_method
 * @property Carbon $spent_on calendar date in the user's timezone
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Expense extends Model
{
    /** @use HasFactory<ExpenseFactory> */
    use HasFactory;

    /** user_id and budget_id are assigned by the server, never mass-assigned. */
    protected $fillable = [
        'category_id',
        'amount',
        'description',
        'notes',
        'payment_method',
        'spent_on',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'spent_on' => 'date',
            'payment_method' => PaymentMethod::class,
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Budget, $this> */
    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    /** @return BelongsTo<ExpenseCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'category_id');
    }
}
