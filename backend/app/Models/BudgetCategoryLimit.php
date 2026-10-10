<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Optional spending cap for one expense category within a budget.
 *
 * @property int $id
 * @property int $budget_id
 * @property int $category_id
 * @property string $limit_amount
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class BudgetCategoryLimit extends Model
{
    protected $fillable = [
        'category_id',
        'limit_amount',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'limit_amount' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Budget, $this> */
    public function budget(): BelongsTo
    {
        return $this->belongsTo(Budget::class);
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
