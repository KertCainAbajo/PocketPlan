<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_category_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->decimal('limit_amount', 12, 2);
            $table->timestamps();

            $table->unique(['budget_id', 'category_id']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE budget_category_limits ADD CONSTRAINT budget_category_limits_amount_chk CHECK (limit_amount >= 0)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_category_limits');
    }
};
