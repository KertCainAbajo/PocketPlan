<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('daily_warning')->default(true);
            $table->boolean('threshold_alert')->default(true);
            $table->boolean('budget_ending')->default(true);
            $table->boolean('budget_completed')->default(true);
            $table->boolean('daily_reminder')->default(false);
            $table->time('reminder_time')->default('20:00:00');
            $table->unsignedTinyInteger('warning_threshold_percent')->default(80);
            $table->timestamps();
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE notification_preferences ADD CONSTRAINT notif_pref_threshold_chk CHECK (warning_threshold_percent BETWEEN 1 AND 100)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};
