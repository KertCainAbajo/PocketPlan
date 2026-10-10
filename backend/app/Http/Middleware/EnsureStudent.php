<?php

namespace App\Http\Middleware;

use App\Exceptions\Auth\StudentAccountRequiredException;
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
            throw new StudentAccountRequiredException;
        }

        return $next($request);
    }
}
