<?php

namespace App\Console\Commands;

use App\Services\RecurringIncomeGenerator;
use Illuminate\Console\Command;

class GenerateRecurringIncomesCommand extends Command
{
    protected $signature = 'pocketplan:generate-recurring-incomes';

    protected $description = 'Record every recurring income payment that is due (safe to run repeatedly).';

    public function handle(RecurringIncomeGenerator $generator): int
    {
        $created = $generator->generateAll();

        $this->info("Recorded {$created} recurring income payment(s).");

        return self::SUCCESS;
    }
}
