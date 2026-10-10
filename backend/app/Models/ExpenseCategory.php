<?php

namespace App\Models;

use Database\Factories\ExpenseCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $user_id null = default (admin-managed) category
 * @property string $name
 * @property string|null $description
 * @property string|null $icon lucide icon name
 * @property string|null $color hex, e.g. #6C7CF7
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ExpenseCategory extends Model
{
    /** @use HasFactory<ExpenseCategoryFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'icon',
        'color',
        'is_active',
    ];

    /** @var array<string, mixed> */
    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
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
        return $this->hasMany(Expense::class, 'category_id');
    }

    public function isDefault(): bool
    {
        return $this->user_id === null;
    }

    /** @param Builder<self> $query */
    #[Scope]
    protected function defaults(Builder $query): void
    {
        $query->whereNull('user_id');
    }

    /**
     * Categories a student may pick: active defaults plus their own active ones.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function availableTo(Builder $query, User $user): void
    {
        $query->where('is_active', true)
            ->where(fn (Builder $q) => $q->whereNull('user_id')->orWhere('user_id', $user->id));
    }
}
