<?php

namespace App\Jobs;

use App\Cache\SeoCacheKey;
use App\Clients\TmdbClient;
use App\Models\MovieTranslation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class AddImagesToMovie implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $movieId,
        public int $tmdbId
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(TmdbClient $tmdbClient): void
    {
        $images = $tmdbClient->movieImages($this->tmdbId);

        // Get all translations for this movie
        $translations = MovieTranslation::where('movie_id', $this->movieId)->get();

        foreach ($translations as $translation) {
            $lang = $translation->lang_code;

            // Searching for a poster
            $localizedPoster = collect($images['posters'])->firstWhere('iso_639_1', $lang);

            // Searching for a backdrop
            $localizedBackdrop = collect($images['backdrops'])->firstWhere('iso_639_1', $lang);

            // Form data for updating only if something is found
            $updateData = [];

            if ($localizedPoster) {
                $updateData['poster_path'] = $localizedPoster['file_path'];
            }

            if ($localizedBackdrop) {
                $updateData['backdrop_path'] = $localizedBackdrop['file_path'];
            }

            // Updating the database only if there is at least one localized image
            if (!empty($updateData)) {
                $translation->update($updateData);
                Cache::forget(SeoCacheKey::movie($this->tmdbId));
            }
        }
    }
}
