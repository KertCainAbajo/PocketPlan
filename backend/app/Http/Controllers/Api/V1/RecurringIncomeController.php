<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Incomes\CreateRecurringIncome;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreRecurringIncomeRequest;
use App\Http\Requests\Api\V1\UpdateRecurringIncomeRequest;
use App\Http\Resources\V1\RecurringIncomeResource;
use App\Services\RecurringIncomeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class RecurringIncomeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $schedules = $request->user()->recurringIncomes()
            ->with('category')
            ->orderByDesc('is_active')
            ->orderBy('next_due_on')
            ->get();

        return RecurringIncomeResource::collection($schedules);
    }

    public function store(StoreRecurringIncomeRequest $request, CreateRecurringIncome $create): JsonResponse
    {
        /** @var array{category_id: int, amount: string, description: string, frequency: string, start_date: string, end_date?: string|null} $input */
        $input = $request->validated();

        return (new RecurringIncomeResource($create->handle($request->user(), $input)))->response()->setStatusCode(201);
    }

    /** Changes apply to future payments only; already-recorded income is untouched. */
    public function update(UpdateRecurringIncomeRequest $request, int $recurringIncome, RecurringIncomeGenerator $generator): RecurringIncomeResource
    {
        $schedule = $request->user()->recurringIncomes()->findOrFail($recurringIncome);
        $schedule->update($request->validated());

        // Reactivating a schedule catches up on payments that fell due while paused.
        $generator->generateForUser($request->user());

        return new RecurringIncomeResource($schedule->refresh()->load('category'));
    }

    /** Stops the schedule. Income already recorded is kept. */
    public function destroy(Request $request, int $recurringIncome): Response
    {
        $request->user()->recurringIncomes()->findOrFail($recurringIncome)->delete();

        return response()->noContent();
    }
}
