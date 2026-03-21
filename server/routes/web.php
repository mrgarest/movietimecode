<?php

use App\Http\Controllers\AppController;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::controller(AuthController::class)->group(function () {
    Route::get('/login/server', 'server');
    Route::get('/login/extension', 'extension');
    Route::get('/auth/callback', 'callback');
});

// To prevent an error message stating that the router does not exist from appearing
Route::get('/', AppController::class)->name('login');

// React route
Route::get('/{path?}', AppController::class)->where('path', '.*');
