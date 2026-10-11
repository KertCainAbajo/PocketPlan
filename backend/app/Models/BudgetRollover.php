<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/** A dated record of unspent allowance moved into savings when a period closes.
 *
 * @property int $id
 * @property int $user_id
 * @property int $budget_id
 * @property string $amount
 * @property Carbon $saved_on
 */
class BudgetRollover extends Model
{
    protected $fillable = ['user_id', 'budget_id', 'amount', 'saved_on'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'saved_on' => 'date'];
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
}
