<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\CategoryType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\CategoryRequest;
use App\Http\Resources\V1\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /** Active defaults plus all of the student's own categories. ?type=expense|income */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['type' => ['nullable', Rule::enum(CategoryType::class)]]);
        $user = $request->user();

        $categories = Category::query()
            ->where(fn ($q) => $q->where(fn ($d) => $d->whereNull('user_id')->where('is_active', true))->orWhere('user_id', $user->id))
            ->when($request->input('type'), fn ($q, $type) => $q->where('type', $type))
            ->orderByRaw('user_id IS NOT NULL') // defaults first
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function store(CategoryRequest $request): JsonResponse
    {
        $category = new Category($request->safe()->only(['name', 'description', 'icon', 'color']));
        $category->type = CategoryType::from($request->string('type')->toString());
        $category->user()->associate($request->user());
        $category->save();

        return (new CategoryResource($category->refresh()))->response()->setStatusCode(201);
    }

    /** Students can only edit their own categories; defaults are managed by admins. */
    public function update(CategoryRequest $request, int $category): CategoryResource
    {
        $model = $request->user()->personalCategories()->findOrFail($category);
        $model->update($request->safe()->only(['name', 'description', 'icon', 'color', 'is_active']));

        return new CategoryResource($model);
    }
}
