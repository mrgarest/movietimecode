<?php

namespace App\Jobs;

use App\Helpers\Language;
use App\Cache\SeoCacheKey;
use App\Clients\TmdbClient;
use App\Models\MovieTranslation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class AddVideosToMovie implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $movieId,
        public int $tmdbId
    ) {}

    public function handle(TmdbClient $tmdbClient): void
    {
        $updated = false;

        foreach (Language::content() as $langCode => $tmdbLang) {
            $translation = MovieTranslation::where('movie_id', $this->movieId)
                ->where('lang_code', $langCode)
                ->first();

            if (!$translation) continue;

            $videos = collect($tmdbClient->movieVideos($this->tmdbId, $tmdbLang)['results'] ?? [])
                ->filter(fn($v) => $v['site'] === 'YouTube' && $v['type'] === 'Trailer');

            if ($videos->isEmpty()) continue;

            $key = $videos
                ->sortByDesc(fn($v) => [$v['official'] ? 1 : 0, $v['size'], $v['published_at']])
                ->first()['key'] ?? null;

            if ($key) {
                $translation->update(['trailer' => $key]);
                $updated = true;
            }
        }

        if ($updated) Cache::forget(SeoCacheKey::movie($this->tmdbId));
    }
}
