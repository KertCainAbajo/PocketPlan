<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_incomes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('description', 150);
            $table->enum('frequency', ['daily', 'weekly', 'biweekly', 'monthly']);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            // Always start_date + occurrences_generated × interval, so monthly dates never drift.
            $table->date('next_due_on');
            $table->unsignedInteger('occurrences_generated')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['is_active', 'next_due_on']);
            $table->index('user_id');
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE recurring_incomes ADD CONSTRAINT recurring_incomes_amount_chk CHECK (amount > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_incomes');
    }
};
