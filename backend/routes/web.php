<?php

use Illuminate\Support\Facades\Route;

// The admin dashboard (Blade) will be mounted under /admin in Phase 3.
// Until then, the root only identifies the service.
Route::get('/', fn () => response()->json([
    'name' => config('app.name'),
    'api' => url('/api/v1'),
    'health' => url('/up'),
]));
