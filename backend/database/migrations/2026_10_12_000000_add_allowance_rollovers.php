<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->boolean('is_allowance')->default(false)->after('frequency');
            $table->foreignId('recurring_income_id')->nullable()->after('is_allowance')->constrained()->nullOnDelete();
            $table->unsignedInteger('allowance_occurrence')->nullable()->after('recurring_income_id');
            $table->unique(['recurring_income_id', 'allowance_occurrence'], 'budgets_allowance_occurrence_unique');
        });

        Schema::table('recurring_incomes', function (Blueprint $table) {
            $table->boolean('is_allowance')->default(false)->after('is_active');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE budgets MODIFY frequency ENUM('daily','weekly','monthly','yearly','custom') NOT NULL");
            DB::statement("ALTER TABLE recurring_incomes MODIFY frequency ENUM('daily','weekly','biweekly','monthly','yearly') NOT NULL");
        }

        Schema::create('budget_rollovers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('budget_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('saved_on');
            $table->timestamps();

            $table->index(['user_id', 'saved_on']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE budget_rollovers ADD CONSTRAINT budget_rollovers_amount_chk CHECK (amount >= 0)');
        }

        // Existing onboarding allowance schedules and their original budgets
        // continue automatically after deployment.
        $schedules = DB::table('recurring_incomes')->where('description', 'Allowance')->get();
        foreach ($schedules as $schedule) {
            if (! in_array($schedule->frequency, ['daily', 'weekly', 'monthly', 'yearly'], true)) {
                continue;
            }
            DB::table('recurring_incomes')->where('id', $schedule->id)->update(['is_allowance' => true]);
            $budget = DB::table('budgets')
                ->where('user_id', $schedule->user_id)
                ->where('start_date', $schedule->start_date)
                ->where('spending_limit', $schedule->amount)
                ->where('frequency', $schedule->frequency === 'biweekly' ? 'weekly' : $schedule->frequency)
                ->orderBy('id')
                ->first();
            if ($budget) {
                DB::table('budgets')->where('id', $budget->id)->update([
                    'is_allowance' => true,
                    'recurring_income_id' => $schedule->id,
                    'allowance_occurrence' => 0,
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_rollovers');

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE budgets MODIFY frequency ENUM('daily','weekly','monthly','custom') NOT NULL");
            DB::statement("ALTER TABLE recurring_incomes MODIFY frequency ENUM('daily','weekly','biweekly','monthly') NOT NULL");
        }

        Schema::table('recurring_incomes', function (Blueprint $table) {
            $table->dropColumn('is_allowance');
        });
        Schema::table('budgets', function (Blueprint $table) {
            $table->dropUnique('budgets_allowance_occurrence_unique');
            $table->dropConstrainedForeignId('recurring_income_id');
            $table->dropColumn('allowance_occurrence');
            $table->dropColumn('is_allowance');
        });
    }
};
