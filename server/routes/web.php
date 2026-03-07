<?php

use App\Http\Controllers\AppController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\MovieController;
use Illuminate\Support\Facades\Route;

// Outdated authorization method
Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::get('/login/twitch', 'extension');
});

Route::controller(AuthController::class)->group(function () {
    Route::get('/login/server', 'server');
    Route::get('/login/extension', 'extension');
    Route::get('/auth/callback', 'callback');
});

// To prevent an error message stating that the router does not exist from appearing
Route::get('/', AppController::class)->name('login');

Route::get('/movies/timecodes', [MovieController::class, 'withTimecodes']);

// React route
Route::get('/{path?}', AppController::class)->where('path', '.*');
