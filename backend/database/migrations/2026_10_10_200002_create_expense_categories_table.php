<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->id();
            // NULL = default (admin-managed) category; otherwise a student's personal category.
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('description', 255)->nullable();
            $table->string('icon', 40)->nullable();
            $table->char('color', 7)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_categories');
    }
};
