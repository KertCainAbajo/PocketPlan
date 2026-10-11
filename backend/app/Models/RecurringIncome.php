<?php

namespace App\Models;

use App\Enums\RecurrenceFrequency;
use Carbon\CarbonImmutable;
use Database\Factories\RecurringIncomeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A schedule that generates Income records (e.g. weekly allowance every Monday).
 *
 * @property int $id
 * @property int $user_id
 * @property int $category_id
 * @property string $amount
 * @property string $description
 * @property RecurrenceFrequency $frequency
 * @property Carbon $start_date
 * @property Carbon|null $end_date
 * @property Carbon $next_due_on
 * @property int $occurrences_generated
 * @property bool $is_active
 * @property bool $is_allowance
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class RecurringIncome extends Model
{
    /** @use HasFactory<RecurringIncomeFactory> */
    use HasFactory;

    /** next_due_on and occurrences_generated are maintained by the server. */
    protected $fillable = [
        'category_id',
        'amount',
        'description',
        'frequency',
        'start_date',
        'end_date',
        'is_active',
        'is_allowance',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'occurrences_generated' => 0,
        'is_active' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'frequency' => RecurrenceFrequency::class,
            'start_date' => 'date',
            'end_date' => 'date',
            'next_due_on' => 'date',
            'occurrences_generated' => 'integer',
            'is_active' => 'boolean',
            'is_allowance' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<Income, $this> */
    public function incomes(): HasMany
    {
        return $this->hasMany(Income::class);
    }

    /** Date of the n-th payment, counted from start_date. */
    public function occurrence(int $n): CarbonImmutable
    {
        return $this->frequency->occurrence($this->start_date->toImmutable(), $n);
    }

    /** Recompute next_due_on from start_date and the number of payments made. */
    public function syncNextDueDate(): void
    {
        $this->next_due_on = Carbon::instance($this->occurrence($this->occurrences_generated));
    }
}
