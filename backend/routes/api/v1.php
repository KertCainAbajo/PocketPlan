<?php

use App\Http\Controllers\Api\V1\AccountController;
use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\GoogleBrowserLoginController;
use App\Http\Controllers\Api\V1\Auth\GoogleLoginController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\BudgetController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\ExportController;
use App\Http\Controllers\Api\V1\IncomeController;
use App\Http\Controllers\Api\V1\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\OnboardingController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\RecurringIncomeController;
use App\Http\Controllers\Api\V1\SavingsController;
use App\Http\Controllers\Api\V1\SavingsGoalController;
use Illuminate\Support\Facades\Route;

/*
| Student mobile API, version 1. Mounted at /api/v1 by routes/api.php.
| Record IDs are looked up inside the signed-in student's own data, so another
| student's ID always answers 404.
*/

Route::pattern('budget', '[0-9]+');
Route::pattern('category', '[0-9]+');
Route::pattern('expense', '[0-9]+');
Route::pattern('income', '[0-9]+');
Route::pattern('recurringIncome', '[0-9]+');

// Public, rate-limited authentication endpoints.
Route::middleware('throttle:auth')->group(function () {
    Route::post('register', RegisterController::class)->name('register');
    Route::post('login', LoginController::class)->name('login');
    Route::post('auth/google', GoogleLoginController::class)->name('auth.google');
    Route::post('forgot-password', ForgotPasswordController::class)->name('password.email');
    Route::post('reset-password', ResetPasswordController::class)->name('password.reset');
});

// Browser-based Google sign-in (works in Expo Go). See GoogleBrowserLoginController.
Route::middleware('throttle:google-oauth')->group(function () {
    Route::get('auth/google/redirect', [GoogleBrowserLoginController::class, 'redirect'])->name('auth.google.redirect');
    Route::post('auth/google/callback', [GoogleBrowserLoginController::class, 'callback'])->name('auth.google.callback');
    Route::post('auth/google/exchange', [GoogleBrowserLoginController::class, 'exchange'])->name('auth.google.exchange');
});

// Every student endpoint: valid token, active account, student role.
Route::middleware(['auth:sanctum', 'active', 'student', 'throttle:api'])->group(function () {
    Route::post('logout', LogoutController::class)->name('logout');
    Route::get('me', [ProfileController::class, 'show'])->name('me');
    Route::patch('me', [ProfileController::class, 'update'])->name('me.update');
    Route::post('me/password', [ProfileController::class, 'changePassword'])->name('me.password');
    Route::delete('me/sessions', [ProfileController::class, 'revokeOtherSessions'])->name('me.sessions.destroy');
    Route::get('notification-preferences', [NotificationPreferenceController::class, 'show'])->name('notification-preferences.show');
    Route::put('notification-preferences', [NotificationPreferenceController::class, 'update'])->name('notification-preferences.update');
    Route::get('export/transactions', ExportController::class)->name('export.transactions');

    Route::post('onboarding', OnboardingController::class)->name('onboarding');
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('savings', SavingsController::class)->name('savings.index');
    Route::get('savings-goals', [SavingsGoalController::class, 'index'])->name('savings-goals.index');
    Route::post('savings-goals', [SavingsGoalController::class, 'store'])->name('savings-goals.store');
    Route::get('savings-goals/{goal}', [SavingsGoalController::class, 'show'])->whereNumber('goal')->name('savings-goals.show');
    Route::put('savings-goals/{goal}', [SavingsGoalController::class, 'update'])->whereNumber('goal')->name('savings-goals.update');
    Route::post('savings-goals/{goal}/contributions', [SavingsGoalController::class, 'contribute'])->whereNumber('goal')->name('savings-goals.contributions.store');
    Route::get('accounts', [AccountController::class, 'index'])->name('accounts.index');
    Route::post('accounts', [AccountController::class, 'store'])->name('accounts.store');

    Route::apiResource('categories', CategoryController::class)->only(['index', 'store', 'update']);

    Route::apiResource('incomes', IncomeController::class);
    Route::apiResource('recurring-incomes', RecurringIncomeController::class)
        ->parameters(['recurring-incomes' => 'recurringIncome'])
        ->except(['show']);

    Route::apiResource('expenses', ExpenseController::class);

    Route::apiResource('budgets', BudgetController::class)->except(['destroy']);
    Route::post('budgets/{budget}/complete', [BudgetController::class, 'complete'])->name('budgets.complete');
});
