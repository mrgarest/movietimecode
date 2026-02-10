<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::command('queue:process-jobs')->everyMinute();

// Schedule::command('imdb:refresh-cookies')->everyThreeMinutes();

Schedule::command('cache:gc')->hourly();

Schedule::command('model:prune')->hourly();

// Generate sitemap
Schedule::command('sitemap:generate')->hourly();