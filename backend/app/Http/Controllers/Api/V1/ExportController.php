<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function __invoke(Request $request): StreamedResponse
    {
        $user = $request->user();
        $rows = collect();

        $user->incomes()->with(['category', 'account'])->orderBy('received_on')->orderBy('id')->get()->each(function ($income) use ($rows) {
            $rows->push([$income->received_on->toDateString(), 'Income', $income->description, $income->category?->name, $income->account?->name, $income->amount, $income->notes]);
        });
        $user->expenses()->with(['category', 'account'])->orderBy('spent_on')->orderBy('id')->get()->each(function ($expense) use ($rows) {
            $rows->push([$expense->spent_on->toDateString(), 'Expense', $expense->description, $expense->category?->name, $expense->account?->name, '-'.$expense->amount, $expense->notes]);
        });
        $user->savingsGoals()->with(['contributions.account'])->get()->each(function ($goal) use ($rows) {
            $goal->contributions->each(function ($contribution) use ($rows, $goal) {
                $rows->push([$contribution->contributed_on->toDateString(), 'Savings', $goal->name, 'Savings goal', $contribution->account?->name, '-'.$contribution->amount, $contribution->note]);
            });
        });

        $rows = $rows->sortBy(fn (array $row) => $row[0])->values();

        return response()->streamDownload(function () use ($rows) {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount', 'Notes']);
            foreach ($rows as $row) {
                fputcsv($output, array_map(function ($value, $index) {
                    // Keep expense/savings amounts numeric while still guarding
                    // user-controlled text fields against spreadsheet formulas.
                    return $index === 5 && is_numeric($value) ? $value : $this->safeCsvValue($value);
                }, $row, array_keys($row)));
            }
            fclose($output);
        }, 'pocketplan-transactions.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function safeCsvValue(?string $value): ?string
    {
        if ($value !== null && preg_match('/^[=+@\-\t\r]/', $value)) {
            return "'".$value;
        }

        return $value;
    }
}
