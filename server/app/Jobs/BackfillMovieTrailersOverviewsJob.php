<?php

namespace App\Jobs;

use App\Clients\TmdbClient;
use App\Models\MovieTranslation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class BackfillMovieTrailersOverviewsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $movieId,
        public int $tmdbId
    ) {}

    public function handle(TmdbClient $tmdb): void
    {
        $this->backfillOverviews($tmdb);
        $this->backfillTrailers($tmdb);
    }

    private function backfillOverviews(TmdbClient $tmdb): void
    {
        $translations = MovieTranslation::where('movie_id', $this->movieId)
            ->whereNull('overview')
            ->get(['id', 'lang_code']);

        if ($translations->isEmpty()) return;

        $response = $tmdb->movieTranslations($this->tmdbId);
        if (empty($response['translations'])) return;

        $overviewsByLang = collect($response['translations'])
            ->filter(fn($t) => !empty($t['data']['overview']))
            ->mapWithKeys(fn($t) => [strtolower($t['iso_639_1']) => $t['data']['overview']]);

        foreach ($translations as $translation) {
            if ($overviewsByLang->has($translation->lang_code)) {
                $translation->update(['overview' => $overviewsByLang[$translation->lang_code]]);
            }
        }
    }

    private function backfillTrailers(TmdbClient $tmdb): void
    {
        foreach (AddVideosToMovie::TRAILER_LANGUAGES as $langCode => $tmdbLang) {
            $translation = MovieTranslation::where('movie_id', $this->movieId)
                ->where('lang_code', $langCode)
                ->whereNull('trailer')
                ->first();

            if (!$translation) continue;

            $videos = collect($tmdb->movieVideos($this->tmdbId, $tmdbLang)['results'] ?? [])
                ->filter(fn($v) => $v['site'] === 'YouTube' && $v['type'] === 'Trailer');

            if ($videos->isEmpty()) continue;

            $key = $videos
                ->sortByDesc(fn($v) => [$v['official'] ? 1 : 0, $v['size'], $v['published_at']])
                ->first()['key'] ?? null;

            if ($key) $translation->update(['trailer' => $key]);
        }
    }
}
