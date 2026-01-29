<?php

use App\Enums\RoleId;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\MovieController;
use App\Http\Controllers\Api\MovieSanctionController;
use App\Http\Controllers\Api\TimecodeController;
use App\Http\Controllers\Api\TwitchController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('dashboard')
    ->middleware(['throttle:api', 'auth:api', 'not_deactivated', 'scopes:server', 'check_role:' . RoleId::ADMIN->value])
    ->group(function () {
        Route::controller(DashboardController::class)->group(function () {
            Route::get('/statistics', 'statistics');
            Route::get('/timecodes', 'timecodes');
        });

        Route::prefix('/movies/sanctions')->controller(MovieSanctionController::class)->group(function () {
            Route::get('/', 'list');
            Route::prefix('{id}')->group(function () {
                Route::post('/', 'approve');
                Route::delete('/', 'delete');
            });
        });
    });

Route::prefix('movies')->middleware('throttle:api')->controller(MovieController::class)->group(function () {
    Route::get('/latest', 'latest');
    Route::get('/timecodes', 'withTimecodes');
});

Route::prefix('v2')->middleware('throttle:api')->group(function () {
    Route::post('/auth/extension', [AuthController::class, 'extension']);

    Route::prefix('user')
        ->middleware(['auth:api', 'not_deactivated', 'scopes:server'])
        ->controller(UserController::class)
        ->group(function () {
            Route::get('/', 'me');
        });

    Route::prefix('twitch')
        ->middleware(['auth:api', 'not_deactivated', 'scopes:extension'])
        ->controller(TwitchController::class)
        ->group(function () {
            Route::get('/stream/status', 'streamStatus');
            Route::post('/token', 'token');
            Route::post('/content-classification', 'contentClassification');
        });

    Route::prefix('movies')->group(function () {
        Route::controller(MovieController::class)->group(function () {
            Route::get('/search', 'search');
            Route::get('/timecodes/search', 'searchTimecodes');
        });

        Route::post('/sanctions', [MovieSanctionController::class, 'report']);

        Route::prefix('{movieId}')->group(function () {
            Route::controller(MovieController::class)->group(function () {
                Route::get('/', 'details');
                Route::get('/check', 'check');
            });

            Route::prefix('timecodes')->controller(TimecodeController::class)->group(function () {
                Route::middleware(['auth:api', 'not_deactivated', 'scopes:extension'])->group(function () {
                    Route::post('/editor/new', 'new');
                });
                Route::get('/authors', 'authors');
            });
        });
    });

    Route::prefix('timecodes/{timecodeId}')->controller(TimecodeController::class)->group(function () {
        Route::get('/', 'timecodes');
        Route::middleware(['auth:api', 'not_deactivated', 'scopes:extension'])->group(function () {
            Route::prefix('editor')->group(function () {
                Route::get('/', 'editor');
                Route::post('/', 'edit');
            });
            Route::delete('/', 'delete');
        });
    });

    Route::post('/events', [EventController::class, 'store']);
});
