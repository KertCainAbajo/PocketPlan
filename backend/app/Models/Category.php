<?php

namespace App\Models;

use App\Enums\CategoryType;
use Database\Factories\CategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An expense or income category: either a platform default (user_id null,
 * managed by admins) or a student's personal category.
 *
 * @property int $id
 * @property int|null $user_id
 * @property CategoryType $type
 * @property string $name
 * @property string|null $description
 * @property string|null $icon lucide icon name
 * @property string|null $color hex, e.g. #6C7CF7
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Category extends Model
{
    /** @use HasFactory<CategoryFactory> */
    use HasFactory;

    /** user_id and type are set by the server, never mass-assigned. */
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
            'type' => CategoryType::class,
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isDefault(): bool
    {
        return $this->user_id === null;
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    /** @param Builder<self> $query */
    #[Scope]
    protected function defaults(Builder $query): void
    {
        $query->whereNull('user_id');
    }

    /**
     * Platform defaults plus the student's own categories (active or not).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        $query->where(fn (Builder $q) => $q->whereNull('user_id')->orWhere('user_id', $user->id));
    }

    /**
     * Categories a student may pick for a new record: active, of the right type.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function selectableBy(Builder $query, User $user, CategoryType $type): void
    {
        $query->visibleTo($user)->where('type', $type)->where('is_active', true);
    }
}
