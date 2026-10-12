<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Optional time of day for each transaction. Budgets and daily limits still
 * work by date; the time only orders and describes the record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->time('spent_time')->nullable()->after('spent_on');
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->time('received_time')->nullable()->after('received_on');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', fn (Blueprint $table) => $table->dropColumn('spent_time'));
        Schema::table('incomes', fn (Blueprint $table) => $table->dropColumn('received_time'));
    }
};
