<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 100);
            $table->decimal('total_allowance', 12, 2);
            $table->decimal('savings_target', 12, 2)->default(0);
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'custom']);
            $table->enum('status', ['active', 'completed'])->default('active');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'start_date', 'end_date']);
        });

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

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // Assigned by the server from spent_on; NULL = unbudgeted.
            $table->foreignId('budget_id')->nullable()->constrained()->nullOnDelete();
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

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->morphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->restrictOnDelete();
            $table->string('action', 60);
            $table->string('subject_type', 60)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['admin_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
            $table->index(['action', 'created_at']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE budgets ADD CONSTRAINT budgets_dates_chk CHECK (end_date >= start_date)');
            DB::statement('ALTER TABLE budgets ADD CONSTRAINT budgets_amounts_chk CHECK (total_allowance >= 0 AND savings_target >= 0 AND savings_target <= total_allowance)');
            DB::statement('ALTER TABLE expenses ADD CONSTRAINT expenses_amount_chk CHECK (amount > 0)');
            DB::statement('ALTER TABLE savings_goals ADD CONSTRAINT savings_goals_target_chk CHECK (target_amount > 0)');
            DB::statement('ALTER TABLE notification_preferences ADD CONSTRAINT notif_pref_threshold_chk CHECK (warning_threshold_percent BETWEEN 1 AND 100)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('savings_contributions');
        Schema::dropIfExists('savings_goals');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('budgets');
    }
};
