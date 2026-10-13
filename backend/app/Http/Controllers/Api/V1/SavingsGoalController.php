<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SavingsContribution;
use App\Models\SavingsGoal;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SavingsGoalController extends Controller
{
    public function show(Request $request, int $goal): JsonResponse
    {
        $user = $request->user();
        $savingsGoal = $user->savingsGoals()->findOrFail($goal);
        $saved = Money::sum($savingsGoal->contributions()->toBase());
        $today = $user->today()->toImmutable();
        $firstMonth = $today->copy()->startOfMonth()->subMonths(3);
        $monthlyProgress = collect(range(0, 3))->map(function (int $offset) use ($savingsGoal, $firstMonth, $today) {
            $month = $firstMonth->copy()->addMonths($offset);
            $through = $month->isSameMonth($today) ? $today->toDateString() : $month->endOfMonth()->toDateString();

            return [
                'label' => $month->format('M'),
                'date_label' => $month->isSameMonth($today) ? $today->format('M j') : $month->format('M j'),
                'amount' => Money::format(Money::sum($savingsGoal->contributions()->where('contributed_on', '<=', $through)->toBase())),
            ];
        });
        $history = $savingsGoal->contributions()->with('account')->orderByDesc('contributed_on')->orderByDesc('id')->limit(20)->get();

        return response()->json(['data' => [
            'goal' => [
                'id' => $savingsGoal->id,
                'name' => $savingsGoal->name,
                'icon' => $savingsGoal->icon,
                'target_amount' => Money::format($savingsGoal->target_amount),
                'saved_amount' => Money::format($saved),
                'remaining_amount' => Money::format(Money::max(Money::of($savingsGoal->target_amount)->minus($saved), Money::zero())),
                'progress_percent' => Money::percent($saved, Money::of($savingsGoal->target_amount)),
                'target_date' => $savingsGoal->target_date?->toDateString(),
                'reminder_enabled' => $savingsGoal->reminder_enabled,
            ],
            'monthly_progress' => $monthlyProgress,
            'contributions' => $history->map(fn (SavingsContribution $contribution) => [
                'id' => $contribution->id,
                'amount' => Money::format($contribution->amount),
                'contributed_on' => $contribution->contributed_on->toDateString(),
                'note' => $contribution->note,
                // The foreign key guarantees the account exists whenever account_id is set.
                'account_name' => $contribution->account_id !== null ? $contribution->account->name : 'Everyday account',
            ])->values(),
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $goals = $user->savingsGoals()
            ->withSum('contributions as saved_amount', 'amount')
            ->withCount('contributions')
            ->with(['contributions' => fn ($query) => $query->latest('contributed_on')->latest('id')->limit(1)])
            ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'achieved' THEN 1 ELSE 2 END")
            ->orderBy('created_at')
            ->get();

        $monthQuery = SavingsContribution::query()->where('user_id', $user->id)
            ->whereYear('contributed_on', $user->today()->year)
            ->whereMonth('contributed_on', $user->today()->month);
        $activeGoals = $goals->filter(fn (SavingsGoal $goal) => $goal->status->value === 'active');

        return response()->json(['data' => [
            'currency' => $user->currency,
            'total_saved' => Money::format(Money::sum(SavingsContribution::query()->where('user_id', $user->id)->toBase())),
            'combined_target' => Money::format(Money::sum($user->savingsGoals()->toBase(), 'target_amount')),
            'active_count' => $activeGoals->count(),
            'month_added' => Money::format(Money::sum($monthQuery->toBase())),
            'month_contributions' => $monthQuery->count(),
            'goals' => $goals->map(fn (SavingsGoal $goal) => [
                'id' => $goal->id,
                'name' => $goal->name,
                'icon' => $goal->icon,
                'target_amount' => Money::format($goal->target_amount),
                'saved_amount' => Money::format($goal->saved_amount ?? 0),
                'target_date' => $goal->target_date?->toDateString(),
                'reminder_enabled' => $goal->reminder_enabled,
                'status' => $goal->status->value,
                'contribution_count' => $goal->contributions_count,
                'last_contributed_on' => $goal->contributions->first()?->contributed_on?->toDateString(),
            ])->values(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $input = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['required', 'in:laptop,home,travel,emergency,education'],
            'target_amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:9999999999.99'],
            'starting_amount' => ['nullable', 'numeric', 'gte:0', 'decimal:0,2', 'max:9999999999.99'],
            'target_date' => ['nullable', 'date_format:Y-m-d', 'after:'.$request->user()->today()->toDateString()],
            'reminder_enabled' => ['required', 'boolean'],
        ]);
        $user = $request->user();
        $startingAmount = Money::of($input['starting_amount'] ?? 0);
        $goal = DB::transaction(function () use ($user, $input, $startingAmount) {
            $goal = $user->savingsGoals()->create([
                'name' => $input['name'],
                'icon' => $input['icon'],
                'target_amount' => $input['target_amount'],
                'target_date' => $input['target_date'] ?? null,
                'reminder_enabled' => $input['reminder_enabled'],
            ]);

            if ($startingAmount->isPositive()) {
                $contribution = new SavingsContribution([
                    'account_id' => $user->ensureDefaultAccount()->id,
                    'amount' => Money::format($startingAmount),
                    'contributed_on' => $user->today()->toDateString(),
                    'note' => 'Starting amount',
                ]);
                $contribution->user()->associate($user);
                $goal->contributions()->save($contribution);
            }

            return $goal;
        });

        return response()->json(['data' => ['id' => $goal->id]], 201);
    }

    public function update(Request $request, int $goal): JsonResponse
    {
        $input = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'icon' => ['required', 'in:laptop,home,travel,emergency,education'],
            'target_amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:9999999999.99'],
            'target_date' => ['nullable', 'date_format:Y-m-d'],
            'reminder_enabled' => ['required', 'boolean'],
        ]);

        $savingsGoal = $request->user()->savingsGoals()->findOrFail($goal);
        $savingsGoal->update($input);

        return response()->json(['data' => ['id' => $savingsGoal->id]]);
    }

    public function contribute(Request $request, int $goal): JsonResponse
    {
        $input = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:9999999999.99'],
            'account_id' => ['required', 'integer', Rule::exists('accounts', 'id')->where('user_id', $request->user()->id)],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $savedGoal = $request->user()->savingsGoals()->whereKey($goal)->firstOrFail();
        $user = $request->user();
        DB::transaction(function () use ($savedGoal, $user, $input) {
            $contribution = new SavingsContribution([
                'amount' => $input['amount'],
                'account_id' => $input['account_id'],
                'contributed_on' => $user->today()->toDateString(),
                'note' => $input['note'] ?? null,
            ]);
            $contribution->user()->associate($user);
            $savedGoal->contributions()->save($contribution);
        });

        return response()->json(['data' => ['message' => 'Contribution added.']], 201);
    }
}
