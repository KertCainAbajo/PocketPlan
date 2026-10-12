<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\IncomeRequest;
use App\Http\Requests\Api\V1\TransactionFilterRequest;
use App\Http\Resources\V1\IncomeResource;
use App\Models\Income;
use App\Services\RecurringIncomeGenerator;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class IncomeController extends Controller
{
    /** Income history. meta.total_amount sums every matching record. */
    public function index(TransactionFilterRequest $request, RecurringIncomeGenerator $recurring): AnonymousResourceCollection
    {
        $recurring->generateForUser($request->user());

        $query = $request->user()->incomes()
            ->when($request->input('search'), function ($q, string $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($w) => $w->where('description', 'like', $like)->orWhere('notes', 'like', $like));
            })
            ->when($request->input('category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->when($request->input('from'), fn ($q, $from) => $q->where('received_on', '>=', $from))
            ->when($request->input('to'), fn ($q, $to) => $q->where('received_on', '<=', $to));

        $total = Money::sum($query->clone()->toBase());

        $incomes = $query->with('category')
            ->orderBy('received_on', $request->newestFirst() ? 'desc' : 'asc')
            ->orderBy('received_time', $request->newestFirst() ? 'desc' : 'asc')
            ->orderBy('id', $request->newestFirst() ? 'desc' : 'asc')
            ->paginate($request->perPage())
            ->withQueryString();

        return IncomeResource::collection($incomes)->additional(['meta' => ['total_amount' => Money::format($total)]]);
    }

    public function store(IncomeRequest $request): JsonResponse
    {
        $income = new Income($request->validated());
        $income->user()->associate($request->user());
        $income->save();

        return (new IncomeResource($income->load('category')))->response()->setStatusCode(201);
    }

    public function show(Request $request, int $income): IncomeResource
    {
        return new IncomeResource($request->user()->incomes()->with('category')->findOrFail($income));
    }

    public function update(IncomeRequest $request, int $income): IncomeResource
    {
        $model = $request->user()->incomes()->findOrFail($income);
        $model->update($request->validated());

        return new IncomeResource($model->load('category'));
    }

    /** Deleting a generated payment does not regenerate it; the schedule has moved on. */
    public function destroy(Request $request, int $income): Response
    {
        $request->user()->incomes()->findOrFail($income)->delete();

        return response()->noContent();
    }
}
