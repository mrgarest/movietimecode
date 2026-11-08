<?php

namespace App\Jobs;

use App\Clients\TmdbClient;
use App\Models\Movie;
use App\Services\GenreService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Temporary job: attach TMDB genres to an existing movie.
 */
class BackfillMovieGenresJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $movieId,
        public int $tmdbId
    ) {}

    public function handle(TmdbClient $tmdbClient, GenreService $genreService): void
    {
        $movie = Movie::find($this->movieId);
        if (!$movie) return;

        // Genre names in English are needed to match genres by slug
        $movieDetails = $tmdbClient->movieDetails($this->tmdbId, 'en-US');
        if (empty($movieDetails['genres'])) return;

        $genres = $genreService->getOrCreateFromTmdb($movieDetails['genres']);

        if ($genres->isNotEmpty()) $movie->genres()->syncWithoutDetaching($genres->pluck('id'));
    }
}
