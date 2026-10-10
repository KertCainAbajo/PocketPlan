<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\CategoryType;
use App\Models\Category;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * A student's personal category. The type is chosen on creation and cannot change.
 * Names must be unique among the categories the student can see (defaults + own).
 */
class CategoryRequest extends FormRequest
{
    /**
     * @return array<string, array<int, Closure|ValidationRule|Enum|string>>
     */
    public function rules(): array
    {
        $creating = $this->isMethod('post');

        return [
            'type' => $creating ? ['required', Rule::enum(CategoryType::class)] : ['prohibited'],
            'name' => ['required', 'string', 'max:60', $this->uniqueName(...)],
            'description' => ['nullable', 'string', 'max:255'],
            'icon' => ['nullable', 'string', 'max:40', 'regex:/^[a-z0-9-]+$/'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'is_active' => $creating ? ['prohibited'] : ['required', 'boolean'],
        ];
    }

    private function uniqueName(string $attribute, mixed $value, Closure $fail): void
    {
        $type = $this->isMethod('post')
            ? CategoryType::tryFrom((string) $this->input('type'))
            : Category::query()->find($this->route('category'))?->type;

        if (! $type) {
            return;
        }

        $taken = Category::query()->visibleTo($this->user())
            ->where('type', $type)
            ->where('name', trim((string) $value))
            ->when($this->route('category'), fn ($q, $id) => $q->whereKeyNot($id))
            ->exists();

        if ($taken) {
            $fail("You already have a {$type->value} category with this name.");
        }
    }
}
