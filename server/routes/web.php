<?php

use App\Http\Controllers\MovieController;
use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::controller(AuthController::class)->group(function () {
    Route::get('/login/server', 'server');
    Route::get('/login/extension', 'extension');
    Route::get('/auth/callback', 'callback');
    Route::get('/logout', 'logout');
});

// Public routes
Route::get('/', fn() => Inertia::render('index'))->name('login');
Route::get('/faq', fn() => Inertia::render('faq'));
Route::get('/privacy', fn() => Inertia::render('privacy'));
Route::prefix('movies')->controller(MovieController::class)->group(function () {
    Route::get('/timecodes', 'withTimecodes');
    Route::get('/{id}', 'detail');
});

// Dashboard routes (protected)
Route::prefix('dashboard')->middleware(['auth'])->group(function () {
    Route::get('/', fn() => Inertia::render('dashboard/index'));
    Route::get('/timecodes', fn() => Inertia::render('dashboard/timecode'));
    Route::get('/movies/sanctions', fn() => Inertia::render('dashboard/movies/sanctions/index'));
    Route::get('/movies/sanctions/add', fn() => Inertia::render('dashboard/movies/sanctions/add'));
    Route::get('/users', fn() => Inertia::render('dashboard/users'));
    Route::get('/events', fn() => Inertia::render('dashboard/events'));
});
