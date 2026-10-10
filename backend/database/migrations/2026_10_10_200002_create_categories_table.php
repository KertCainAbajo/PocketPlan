<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            // NULL = platform default (admin-managed); otherwise a student's personal category.
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->enum('type', ['expense', 'income']);
            $table->string('name', 60);
            $table->string('description', 255)->nullable();
            $table->string('icon', 40)->nullable();
            $table->char('color', 7)->nullable();
            // Deactivated categories are hidden from pickers but keep their history.
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'type', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
