<?php

use App\Http\Controllers\Api\V1\Auth\ForgotPasswordController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\ResetPasswordController;
use App\Http\Controllers\Api\V1\ProfileController;
use Illuminate\Support\Facades\Route;

/*
| Student mobile API, version 1. Mounted at /api/v1 by routes/api.php.
*/

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
});
