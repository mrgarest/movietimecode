<?php

namespace App\Console\Commands;

use App\Jobs\BackfillMovieGenresJob;
use App\Models\Genre;
use App\Models\Movie;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Temporary command: attach TMDB genres to existing movies.
 */
class BackfillMovieGenres extends Command
{
    protected $signature = 'movies:backfill-genres';

    protected $description = 'Dispatch jobs to attach TMDB genres to existing movies without genres';

    public function handle(): int
    {
        if (!Genre::exists()) {
            $this->error('Genres table is empty. Run: php artisan db:seed --class=GenreSeeder');
            return self::FAILURE;
        }

        $movies = Movie::whereDoesntHave('genres')->whereNotNull('tmdb_id')->get(['id', 'tmdb_id']);

        $total = $movies->count();
        $this->info("Dispatching jobs for {$total} movies...");

        foreach ($movies as $movie) {
            $delay = Carbon::now()->addSeconds(mt_rand(60, 28800));
            BackfillMovieGenresJob::dispatch($movie->id, $movie->tmdb_id)->delay($delay);
        }

        $this->info('Done. Jobs will run within the next 8 hours.');

        return self::SUCCESS;
    }
}
