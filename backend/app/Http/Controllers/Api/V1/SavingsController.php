<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SavingsContribution;
use App\Services\AllowancePeriodManager;
use App\Services\RecurringIncomeGenerator;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavingsController extends Controller
{
    public function __invoke(Request $request, AllowancePeriodManager $allowances, RecurringIncomeGenerator $recurring): JsonResponse
    {
        $user = $request->user();
        $this->validate($request, ['year' => ['nullable', 'integer', 'min:2000', 'max:'.($user->today()->year)]]);
        $recurring->generateForUser($user);
        $allowances->ensureCurrent($user);

        $year = (int) $request->input('year', $user->today()->year);
        $allRollovers = Money::sum($user->budgetRollovers()->toBase());
        $allContributions = Money::sum(SavingsContribution::query()->where('user_id', $user->id)->toBase());
        $yearRollovers = Money::sum($user->budgetRollovers()->whereYear('saved_on', $year)->toBase());
        $yearContributions = Money::sum(SavingsContribution::query()->where('user_id', $user->id)->whereYear('contributed_on', $year)->toBase());

        $periods = $user->budgetRollovers()
            ->whereYear('saved_on', $year)
            ->with('budget')
            ->orderByDesc('saved_on')
            ->get()
            ->map(function ($rollover) {
                $budget = $rollover->budget;
                $spent = Money::sum($budget->expenses()->toBase());

                return [
                    'id' => $rollover->id,
                    'frequency' => $budget->frequency->value,
                    'allowance_amount' => Money::format($budget->spending_limit),
                    'spent' => Money::format($spent),
                    'saved_amount' => Money::format($rollover->amount),
                    'start_date' => $budget->start_date->toDateString(),
                    'end_date' => $budget->end_date->toDateString(),
                    'saved_on' => $rollover->saved_on->toDateString(),
                ];
            })->values();

        return response()->json(['data' => [
            'currency' => $user->currency,
            'year' => $year,
            'total_saved' => Money::format($allRollovers->plus($allContributions)),
            'allowance_rollovers_total' => Money::format($allRollovers),
            'goal_contributions_total' => Money::format($allContributions),
            'year_total_saved' => Money::format($yearRollovers->plus($yearContributions)),
            'year_rollovers_total' => Money::format($yearRollovers),
            'year_goal_contributions_total' => Money::format($yearContributions),
            'periods' => $periods,
        ]]);
    }
}
