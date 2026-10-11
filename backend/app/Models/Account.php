<?php

namespace App\Models;

use App\Support\Money;
use Brick\Math\BigDecimal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $type
 * @property string $opening_balance
 * @property bool $is_default
 */
class Account extends Model
{
    /** @var list<string> */
    protected $fillable = ['name', 'type', 'opening_balance'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['opening_balance' => 'decimal:2', 'is_default' => 'boolean'];
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

    /** @return HasMany<Income, $this> */
    public function incomes(): HasMany
    {
        return $this->hasMany(Income::class);
    }

    public function balance(): BigDecimal
    {
        $balance = Money::of($this->opening_balance)
            ->plus(Money::sum($this->incomes()->toBase()))
            ->minus(Money::sum($this->expenses()->toBase()));

        if ($this->is_default) {
            $balance = $balance->minus(Money::sum(SavingsContribution::query()->where('user_id', $this->user_id)->toBase()));
        }

        return $balance;
    }
}
