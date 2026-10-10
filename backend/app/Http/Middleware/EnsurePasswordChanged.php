<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Forces an admin created with an initial password to change it before
 * using any other part of the dashboard.
 */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password) {
            return redirect()->route('admin.settings')
                ->with('warning', 'Please change your initial password before continuing.');
        }

        return $next($request);
    }
}
