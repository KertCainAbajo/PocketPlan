<?php

use Illuminate\Support\Facades\Route;

// Keep the API service useful when opened in a browser, while retaining a
// local service summary when no public landing page URL is configured.
Route::get('/', function () {
    if (config('app.landing_url')) {
        return redirect()->away(config('app.landing_url'));
    }

    return response()->json([
        'name' => config('app.name'),
        'api' => url('/api/v1'),
        'health' => url('/up'),
    ]);
});
