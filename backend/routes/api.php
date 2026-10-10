<?php

use Illuminate\Support\Facades\Route;

// Every API version lives in its own file so a future v2 can coexist with v1.
Route::prefix('v1')->name('api.v1.')->group(base_path('routes/api/v1.php'));
