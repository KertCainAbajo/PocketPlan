<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Assigned by the server from spent_on; NULL = unbudgeted.
            $table->foreignId('budget_id')->nullable()->constrained()->nullOnDelete();
            // Categories are deactivated, never deleted, so history is preserved.
            $table->foreignId('category_id')->constrained('expense_categories')->restrictOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('description', 150);
            $table->text('notes')->nullable();
            $table->enum('payment_method', ['cash', 'gcash', 'maya', 'card', 'bank_transfer', 'other'])->nullable();
            $table->date('spent_on');
            $table->timestamps();

            $table->index(['user_id', 'spent_on']);
            $table->index(['budget_id', 'spent_on']);
            $table->index(['user_id', 'category_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE expenses ADD CONSTRAINT expenses_amount_chk CHECK (amount > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
