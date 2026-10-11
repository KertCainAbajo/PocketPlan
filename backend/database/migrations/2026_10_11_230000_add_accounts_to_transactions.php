<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('type', 20)->default('cash');
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            $table->unique(['user_id', 'name']);
            $table->index(['user_id', 'is_default']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index(['account_id', 'spent_on']);
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index(['account_id', 'received_on']);
        });

        DB::table('users')->select('id')->orderBy('id')->chunkById(200, function ($users) {
            foreach ($users as $user) {
                $now = now();
                $accountId = DB::table('accounts')->insertGetId([
                    'user_id' => $user->id,
                    'name' => 'Everyday account',
                    'type' => 'cash',
                    'opening_balance' => '0.00',
                    'is_default' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                DB::table('expenses')->where('user_id', $user->id)->update(['account_id' => $accountId]);
                DB::table('incomes')->where('user_id', $user->id)->update(['account_id' => $accountId]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropIndex(['account_id', 'spent_on']);
            $table->dropColumn('account_id');
        });

        Schema::table('incomes', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropIndex(['account_id', 'received_on']);
            $table->dropColumn('account_id');
        });

        Schema::dropIfExists('accounts');
    }
};
