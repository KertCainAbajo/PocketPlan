<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Expenses\SaveExpense;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\ExpenseRequest;
use App\Http\Requests\Api\V1\TransactionFilterRequest;
use App\Http\Resources\V1\ExpenseResource;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ExpenseController extends Controller
{
    /**
     * Expense history with search, filters and sorting. meta.total_amount is
     * the sum of all matching expenses, not just the current page.
     */
    public function index(TransactionFilterRequest $request): AnonymousResourceCollection
    {
        $query = $request->user()->expenses()
            ->when($request->input('search'), function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($w) => $w->where('description', 'like', $like)->orWhere('notes', 'like', $like));
            })
            ->when($request->input('category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->when($request->input('budget_id'), fn ($q, $id) => $q->where('budget_id', $id))
            ->when($request->input('from'), fn ($q, $from) => $q->where('spent_on', '>=', $from))
            ->when($request->input('to'), fn ($q, $to) => $q->where('spent_on', '<=', $to));

        $total = Money::sum($query->clone()->toBase());

        $expenses = $query->with('category')
            ->orderBy('spent_on', $request->newestFirst() ? 'desc' : 'asc')
            ->orderBy('spent_time', $request->newestFirst() ? 'desc' : 'asc')
            ->orderBy('id', $request->newestFirst() ? 'desc' : 'asc')
            ->paginate($request->perPage())
            ->withQueryString();

        return ExpenseResource::collection($expenses)->additional(['meta' => ['total_amount' => Money::format($total)]]);
    }

    public function store(ExpenseRequest $request, SaveExpense $save): JsonResponse
    {
        /** @var array{category_id: int, amount: string, description: string, notes?: string|null, payment_method?: string|null, spent_on: string} $input */
        $input = $request->validated();

        return (new ExpenseResource($save->create($request->user(), $input)))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $expense): ExpenseResource
    {
        return new ExpenseResource($request->user()->expenses()->with('category')->findOrFail($expense));
    }

    public function update(ExpenseRequest $request, int $expense, SaveExpense $save): ExpenseResource
    {
        /** @var array{category_id: int, amount: string, description: string, notes?: string|null, payment_method?: string|null, spent_on: string} $input */
        $input = $request->validated();

        return new ExpenseResource($save->update($request->user()->expenses()->findOrFail($expense), $input));
    }

    public function destroy(Request $request, int $expense): Response
    {
        $request->user()->expenses()->findOrFail($expense)->delete();

        return response()->noContent();
    }
}
