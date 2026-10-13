<?php

use Illuminate\Support\Facades\Schedule;

// Run the scheduler with `php artisan schedule:work` (dev) or a cron entry (production).
// Due payments are also generated whenever a student opens the dashboard or income list.
Schedule::command('pocketplan:generate-recurring-incomes')->hourly()->withoutOverlapping();

// Deletes expired email sign-in codes (see EmailLoginCode::prunable).
Schedule::command('model:prune')->daily();
