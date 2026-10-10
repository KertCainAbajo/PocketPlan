<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Budgets\CompleteBudget;
use App\Actions\Budgets\SaveBudget;
use App\Enums\BudgetStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\BudgetRequest;
use App\Http\Requests\Api\V1\CompleteBudgetRequest;
use App\Http\Resources\V1\BudgetResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class BudgetController extends Controller
{
    /** Newest first. ?status=active|completed */
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate(['status' => ['nullable', Rule::enum(BudgetStatus::class)]]);

        $budgets = $request->user()->budgets()
            ->with('user.notificationPreference')
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('start_date')
            ->paginate(20)
            ->withQueryString();

        return BudgetResource::collection($budgets);
    }

    public function store(BudgetRequest $request, SaveBudget $save): JsonResponse
    {
        /** @var array{name: string, spending_limit: string, frequency: string, start_date: string, end_date?: string|null, category_limits?: list<array{category_id: int, limit_amount: string}>|null} $input */
        $input = $request->validated();

        $budget = $save->create($request->user(), $input);

        return (new BudgetResource($budget->load('categoryLimits')))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $budget): BudgetResource
    {
        return new BudgetResource($request->user()->budgets()->with('categoryLimits')->findOrFail($budget));
    }

    public function update(BudgetRequest $request, int $budget, SaveBudget $save): BudgetResource
    {
        /** @var array{name: string, spending_limit: string, frequency: string, start_date: string, end_date?: string|null, category_limits?: list<array{category_id: int, limit_amount: string}>|null} $input */
        $input = $request->validated();

        $model = $save->update($request->user()->budgets()->findOrFail($budget), $input);

        return new BudgetResource($model->load('categoryLimits'));
    }

    public function complete(CompleteBudgetRequest $request, int $budget, CompleteBudget $complete): BudgetResource
    {
        $model = $complete->handle($request->user()->budgets()->findOrFail($budget), $request->input('end_date'));

        return new BudgetResource($model->load('categoryLimits'));
    }
}
