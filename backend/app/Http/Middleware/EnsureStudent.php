<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The mobile API is for students only. Admins use the web dashboard.
 */
class EnsureStudent
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->isStudent()) {
            return response()->json(['message' => 'This action is only available to student accounts.'], 403);
        }

        return $next($request);
    }
}
