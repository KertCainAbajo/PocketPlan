<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('savings_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->decimal('target_amount', 12, 2);
            $table->date('target_date')->nullable();
            $table->enum('status', ['active', 'achieved', 'archived'])->default('active');
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE savings_goals ADD CONSTRAINT savings_goals_target_chk CHECK (target_amount > 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('savings_goals');
    }
};
