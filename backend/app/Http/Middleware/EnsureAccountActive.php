<?php

namespace App\Http\Middleware;

use App\Exceptions\Auth\AccountDeactivatedException;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks deactivated accounts, even if they still hold a token or session.
 */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isActive()) {
            return $next($request);
        }

        if ($request->is('api/*')) {
            // Revoke every device, not just the one making this request.
            $user->tokens()->delete();

            throw new AccountDeactivatedException;
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->guest('/admin/login')
            ->withErrors(['email' => AccountDeactivatedException::MESSAGE]);
    }
}
