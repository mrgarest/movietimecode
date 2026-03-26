<?php

use App\Exceptions\ApiException;
use App\Exceptions\ApiExceptionHandler;
use App\Http\Middleware\CheckDeactivated;
use App\Http\Middleware\CheckRole;
use App\Http\Resources\ErrorResource;
use Illuminate\Http\Request;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Laravel\Passport\Exceptions\AuthenticationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');
        $middleware->encryptCookies(except: ['uat']);
        $middleware->alias([
            'not_deactivated' => CheckDeactivated::class,
            'check_role' => CheckRole::class
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Intercepts validation error to implement custom error response
        $exceptions->render(function (\Illuminate\Validation\ValidationException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return ErrorResource::make(
                    code: 'BAD_REQUEST',
                    status: 400,
                    message: $e->getMessage(),
                )->toResponse($request);
            }
            return null;
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return ErrorResource::make(
                    code: 'ACCESS_TOKEN_INVALID',
                    status: 401,
                    message: 'Access token invalid',
                )->toResponse($request);
            }
        });

        // Disables API error logging
        $exceptions->dontReport([
            ApiException::class,
        ]);

        // Instead of a 404 page, a JSON response with a 404 error is returned.
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                // Get the exception class name
                $className = get_class($e);

                // Get our custom handlers
                $handlers = ApiExceptionHandler::$handlers;

                // Check if we have a specific handler for this exception
                if (array_key_exists($className, $handlers)) {
                    $method = $handlers[$className];
                    $apiHandler = new ApiExceptionHandler();
                    return $apiHandler->$method($e, $request);
                }
            }
            return null;
        });
    })->create();
