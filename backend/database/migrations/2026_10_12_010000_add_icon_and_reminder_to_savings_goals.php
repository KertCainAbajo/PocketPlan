<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('savings_goals', function (Blueprint $table) {
            $table->string('icon', 20)->default('laptop')->after('name');
            $table->boolean('reminder_enabled')->default(true)->after('target_date');
        });

        DB::table('savings_goals')->whereRaw("LOWER(name) LIKE '%emergency%'")->update(['icon' => 'emergency']);
        DB::table('savings_goals')->where(function ($query) {
            $query->whereRaw("LOWER(name) LIKE '%travel%'")
                ->orWhereRaw("LOWER(name) LIKE '%japan%'")
                ->orWhereRaw("LOWER(name) LIKE '%trip%'");
        })->update(['icon' => 'travel']);
    }

    public function down(): void
    {
        Schema::table('savings_goals', function (Blueprint $table) {
            $table->dropColumn(['icon', 'reminder_enabled']);
        });
    }
};
