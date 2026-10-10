<?php

namespace App\Rules;

use App\Enums\CategoryType;
use App\Models\Category;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The category must be visible to the student (a default or their own),
 * active, and of the expected type. When editing a record, its current
 * category stays valid even if it has since been deactivated.
 */
class SelectableCategory implements ValidationRule
{
    public function __construct(
        private readonly User $user,
        private readonly CategoryType $type,
        private readonly ?int $currentCategoryId = null,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value)) {
            $fail('Choose a valid category.');

            return;
        }

        $id = (int) $value;

        $query = $id === $this->currentCategoryId
            ? Category::query()->visibleTo($this->user)->where('type', $this->type)
            : Category::query()->selectableBy($this->user, $this->type);

        if (! $query->whereKey($id)->exists()) {
            $fail("Choose a valid {$this->type->value} category.");
        }
    }
}
