<?php

namespace App\Console\Commands;

use App\Jobs\BackfillMovieTrailersOverviewsJob;
use App\Models\Movie;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillMovieTrailersAndOverviews extends Command
{
    protected $signature = 'movies:backfill-trailers-overviews';

    protected $description = 'Dispatch jobs to backfill trailer (en/uk) and overview for existing movies';

    public function handle(): void
    {
        $movies = Movie::whereHas('translations', function ($q) {
            $q->whereNull('trailer')->orWhereNull('overview');
        })->whereNotNull('tmdb_id')->get(['id', 'tmdb_id']);

        $total = $movies->count();
        $this->info("Dispatching jobs for {$total} movies...");

        foreach ($movies as $movie) {
            $delay = Carbon::now()->addSeconds(mt_rand(60, 28800));
            BackfillMovieTrailersOverviewsJob::dispatch($movie->id, $movie->tmdb_id)->delay($delay);
        }

        $this->info("Done. Jobs will run within the next 8 hours.");
    }
}
