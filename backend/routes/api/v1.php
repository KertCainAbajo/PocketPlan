<?php

use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\BudgetController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\IncomeController;
use App\Http\Controllers\Api\V1\OnboardingController;
use App\Http\Controllers\Api\V1\ProfileController;
use App\Http\Controllers\Api\V1\RecurringIncomeController;
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
    Route::post('forgot-password', ForgotPasswordController::class)->name('password.email');
    Route::post('reset-password', ResetPasswordController::class)->name('password.reset');
});

// Every student endpoint: valid token, active account, student role.
Route::middleware(['auth:sanctum', 'active', 'student', 'throttle:api'])->group(function () {
    Route::post('logout', LogoutController::class)->name('logout');
    Route::get('me', [ProfileController::class, 'show'])->name('me');

    Route::post('onboarding', OnboardingController::class)->name('onboarding');
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::apiResource('categories', CategoryController::class)->only(['index', 'store', 'update']);

    Route::apiResource('incomes', IncomeController::class);
    Route::apiResource('recurring-incomes', RecurringIncomeController::class)
        ->parameters(['recurring-incomes' => 'recurringIncome'])
        ->except(['show']);

    Route::apiResource('expenses', ExpenseController::class);

    Route::apiResource('budgets', BudgetController::class)->except(['destroy']);
    Route::post('budgets/{budget}/complete', [BudgetController::class, 'complete'])->name('budgets.complete');
});
