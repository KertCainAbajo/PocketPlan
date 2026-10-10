<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            // How much the student plans to spend in this period (not money received).
            $table->decimal('spending_limit', 12, 2);
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'custom']);
            $table->enum('status', ['active', 'completed'])->default('active');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'start_date', 'end_date']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE budgets ADD CONSTRAINT budgets_dates_chk CHECK (end_date >= start_date)');
            DB::statement('ALTER TABLE budgets ADD CONSTRAINT budgets_limit_chk CHECK (spending_limit >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
