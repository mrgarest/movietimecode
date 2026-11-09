<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks requests whose User-Agent contains one of the blocked substrings.
 */
class BlockUserAgents
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userAgent = $request->userAgent();

        if ($userAgent) {
            foreach (config('blocked-user-agents', []) as $agent) {
                if (stripos($userAgent, $agent) !== false) {
                    // If the request is an API request or expects JSON, throw a 403 Forbidden exception
                    if ($request->is('api/*') || $request->expectsJson()) {
                        throw ApiException::forbidden();
                    }

                    // Render the React page with a 403 status code
                    return Inertia::render('forbidden')
                        ->toResponse($request)
                        ->setStatusCode(Response::HTTP_FORBIDDEN);
                }
            }
        }

        return $next($request);
    }
}
