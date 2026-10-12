<?php

namespace App\Console\Commands;

use App\Services\AllowancePeriodManager;
use App\Services\RecurringIncomeGenerator;
use Illuminate\Console\Command;

class GenerateRecurringIncomesCommand extends Command
{
    protected $signature = 'pocketplan:generate-recurring-incomes';

    protected $description = 'Record every recurring income payment that is due (safe to run repeatedly).';

    public function handle(RecurringIncomeGenerator $generator, AllowancePeriodManager $allowances): int
    {
        $created = $generator->generateAll();
        $periods = $allowances->advanceAll();

        $this->info("Recorded {$created} recurring income payment(s) and advanced {$periods} allowance period(s).");

        return self::SUCCESS;
    }
}
