<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('savings_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('savings_goal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Negative amount = withdrawal. Contributions are never expenses.
            $table->decimal('amount', 12, 2);
            $table->date('contributed_on');
            $table->string('note', 150)->nullable();
            $table->timestamps();

            $table->index(['savings_goal_id', 'contributed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_contributions');
    }
};
