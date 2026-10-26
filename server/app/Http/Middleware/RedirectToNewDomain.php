<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectToNewDomain
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->getHost() !== 'movietimecode.mrgarest.com') {
            return $next($request);
        }

        if ($request->is('api') || $request->is('api/*')) {
            return $next($request);
        }

        return redirect()->away(
            'https://movietimecode.garest.net' . $request->getRequestUri(),
            301
        );
    }
}
