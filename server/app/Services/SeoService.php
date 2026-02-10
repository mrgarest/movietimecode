<?php

namespace App\Services;

use App\Cache\SeoCacheKey;
use App\Clients\TmdbClient;
use App\Models\Movie;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Lang;
use RalphJSmit\Laravel\SEO\Support\SEOData;

class SeoService
{
    private string $suffix = ' | Movie Timecode';
    private string $langCode = 'uk';
    private string $image = 'images/b35hj3.jpg';

    public function getSeoData(string $path): ?SEOData
    {
        // Dynamic path for movies
        if (preg_match('/^movies\/(\d+)$/', $path, $matches)) {
            return $this->getMovieSeoData($matches[1]);
        }

        return match ($path) {
            'movies/timecodes' => new SEOData(
                title: Lang::get('seoTitleMoviesWithTimecodes', [], $this->langCode),
                description: Lang::get('seoDescriptionMoviesWithTimecodes', [], $this->langCode),
                image: asset($this->image)
            ),
            'privacy' => new SEOData(title: Lang::get('privacyPolicy', [], $this->langCode)),
            default => new SEOData(
                title: Lang::get('seoTitle', [], $this->langCode),
                description: Lang::get('seoDescription', [], $this->langCode),
                image: asset($this->image)
            ),
        };
    }

    /**
     * Get SEO data for a specific movie by its ID.
     * 
     * @param int $tmdbId
     * @return SEOData|null
     */
    private function getMovieSeoData(int $tmdbId): ?SEOData
    {
        $data = Cache::remember(SeoCacheKey::movie($tmdbId), Carbon::now()->addMinutes(10), function () use ($tmdbId) {
            $movie = Movie::select(['id', 'release_date', 'title', 'poster_path'])
                ->with([
                    'translations' => fn($query) => $query
                        ->select(['id', 'movie_id', 'title', 'lang_code', 'poster_path'])
                        ->where('lang_code', 'uk')
                ])
                ->tmdbId($tmdbId)
                ->first();

            if (!$movie) return null;

            $translation = $movie->translations->first();
            $title = $translation->title ?? $movie->title;
            $year = $movie->release_date ? $movie->release_date->format('Y') : 'N/A';
            $poster = $translation->poster_path ?? $movie->poster_path;

            return [
                'title' => "{$title} ({$year})",
                'image' => $poster ? TmdbClient::getImageUrl('w500', str_replace('/', '', $poster)) : asset($this->image)
            ];
        });

        if (!$data) return null;

        return new SEOData(
            title: $data['title'] . $this->suffix,
            description: Lang::get('seoDescriptionMoviesWithTimecodes', [], $this->langCode),
            image: $data['image']
        );
    }
}
