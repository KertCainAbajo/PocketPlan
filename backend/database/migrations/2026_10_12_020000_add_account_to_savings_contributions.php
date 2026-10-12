<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('savings_contributions', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->index(['account_id', 'contributed_on']);
        });

        DB::table('savings_contributions')->whereNull('account_id')->orderBy('id')->chunkById(200, function ($contributions) {
            foreach ($contributions as $contribution) {
                $accountId = DB::table('accounts')->where('user_id', $contribution->user_id)
                    ->where('is_default', true)->value('id');
                if ($accountId) {
                    DB::table('savings_contributions')->where('id', $contribution->id)->update(['account_id' => $accountId]);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('savings_contributions', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropIndex(['account_id', 'contributed_on']);
            $table->dropColumn('account_id');
        });
    }
};
