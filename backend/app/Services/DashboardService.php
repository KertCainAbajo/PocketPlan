<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Income;
use App\Models\User;
use App\Services\Budget\BudgetPeriods;
use App\Services\Budget\BudgetSummaryService;
use App\Support\Money;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Everything the home screen shows, computed on the server in one request.
 */
class DashboardService
{
    private const RECENT_LIMIT = 5;

    public function __construct(
        private readonly BalanceService $balance,
        private readonly BudgetPeriods $periods,
        private readonly BudgetSummaryService $summaries,
        private readonly RecurringIncomeGenerator $recurring,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(User $user): array
    {
        // Record any recurring income that fell due since the last visit.
        $this->recurring->generateForUser($user);

        $today = $user->today();
        $monthTotals = $this->balance->totalsBetween($user, $today->copy()->startOfMonth(), $today->copy()->endOfMonth());

        $budget = $this->periods->current($user);
        $snapshot = $budget ? $this->summaries->summarize($budget) : null;

        return [
            'greeting_name' => explode(' ', trim($user->name))[0],
            'currency' => $user->currency,
            'today' => $today->toDateString(),
            'available_balance' => Money::format($this->balance->available($user)),
            'this_month' => [
                'income' => Money::format($monthTotals['income']),
                'expenses' => Money::format($monthTotals['expenses']),
                'net' => Money::format($monthTotals['income']->minus($monthTotals['expenses'])),
            ],
            'today_spending' => Money::format(Money::sum($user->expenses()->where('spent_on', $today->toDateString())->toBase())),
            'budget' => $budget && $snapshot ? [
                'id' => $budget->id,
                'name' => $budget->name,
                'start_date' => $budget->start_date->toDateString(),
                'end_date' => $budget->end_date->toDateString(),
                'summary' => $snapshot->toArray(),
                'category_limits' => $this->summaries->categoryLimits($budget),
            ] : null,
            'category_breakdown' => $budget ? $this->categoryBreakdown($budget->expenses()->getQuery()) : [],
            'recent_transactions' => $this->recentTransactions($user),
        ];
    }

    /**
     * Spending per category, largest first.
     *
     * @param  Builder<Expense>  $expenses
     * @return list<array<string, mixed>>
     */
    private function categoryBreakdown($expenses): array
    {
        $rows = $expenses->clone()
            ->join('categories', 'categories.id', '=', 'expenses.category_id')
            ->selectRaw('categories.id, categories.name, categories.icon, SUM(expenses.amount) as total')
            ->groupBy('categories.id', 'categories.name', 'categories.icon')
            ->orderByDesc('total')
            ->toBase()
            ->get();

        $grandTotal = $rows->reduce(fn ($carry, $row) => $carry->plus(Money::of((string) $row->total)), Money::zero());

        return $rows->map(fn ($row) => [
            'category_id' => (int) $row->id,
            'name' => $row->name,
            'icon' => $row->icon,
            'total' => Money::format((string) $row->total),
            'percent' => Money::percent(Money::of((string) $row->total), $grandTotal),
        ])->values()->all();
    }

    /**
     * Latest incomes and expenses merged into one list, newest first.
     *
     * @return list<array<string, mixed>>
     */
    private function recentTransactions(User $user): array
    {
        $expenses = $user->expenses()->with('category')->latest('spent_on')->latest('id')->limit(self::RECENT_LIMIT)->get()
            ->map(fn (Expense $e) => $this->transaction('expense', $e->id, $e->amount, $e->description, $e->spent_on->toDateString(), $e->created_at?->toIso8601String(), $e->category->only(['id', 'name', 'icon'])));

        $incomes = $user->incomes()->with('category')->latest('received_on')->latest('id')->limit(self::RECENT_LIMIT)->get()
            ->map(fn (Income $i) => $this->transaction('income', $i->id, $i->amount, $i->description, $i->received_on->toDateString(), $i->created_at?->toIso8601String(), $i->category->only(['id', 'name', 'icon'])));

        /** @var Collection<int, array<string, mixed>> $merged */
        $merged = $expenses->concat($incomes)
            ->sortBy([['date', 'desc'], ['created_at', 'desc']]);

        return $merged->take(self::RECENT_LIMIT)->values()->all();
    }

    /**
     * @param  array<string, mixed>  $category
     * @return array<string, mixed>
     */
    private function transaction(string $type, int $id, string $amount, string $description, string $date, ?string $createdAt, array $category): array
    {
        return [
            'type' => $type,
            'id' => $id,
            'amount' => Money::format($amount),
            'description' => $description,
            'date' => $date,
            'created_at' => $createdAt,
            'category' => $category,
        ];
    }
}
