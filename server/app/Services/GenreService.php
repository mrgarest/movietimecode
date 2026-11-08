<?php

namespace App\Services;

use App\Cache\GenreCacheKey;
use App\DTO\Movie\MovieGenreData;
use App\Models\Genre;
use App\Models\Movie;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GenreService
{
    /**
     * Get the genres from the TMDB movie details.
     * All TMDB genres are seeded in advance, so an unknown genre is only created with its English name.
     *
     * @param array $tmdbGenres Genres from TMDB movie details
     * @return Collection<int, Genre>
     */
    public function getOrCreateFromTmdb(array $tmdbGenres): Collection
    {
        $tmdbGenres = collect($tmdbGenres)
            ->filter(fn($g) => !empty($g['name']))
            ->mapWithKeys(fn($g) => [Str::slug($g['name']) => $g['name']]);

        if ($tmdbGenres->isEmpty()) return collect();

        $genres = Genre::query()->whereIn('slug', $tmdbGenres->keys())->get()->keyBy('slug');

        foreach ($tmdbGenres->diffKeys($genres) as $slug => $name) {
            $genre = Genre::createOrFirst(['slug' => $slug]);

            if ($genre->wasRecentlyCreated) {
                $genre->translations()->create(['lang_code' => 'en', 'name' => $name]);
                Log::warning("New TMDB genre created without translations: {$slug}");
            }

            $genres->put($slug, $genre);
        }

        return $genres->values();
    }

    /**
     * Get the movie genres with names in the language (falls back to English).
     *
     * @param Movie $movie
     * @param string $langCode
     * @return Collection<int, MovieGenreData>
     */
    public function getForMovie(Movie $movie, string $langCode = 'uk'): Collection
    {
        $data = Cache::remember(GenreCacheKey::forMovie($movie->id, $langCode), Carbon::now()->addMinutes(5), function () use ($movie, $langCode) {
            return $movie->genres()
                ->with(['translations' => fn($q) => $q->whereIn('lang_code', [$langCode, 'en'])])
                ->get()
                ->map(fn(Genre $genre) => MovieGenreData::fromModel($genre, $langCode))
                ->sortBy('name')
                ->map->toArray()
                ->values()
                ->all();
        });

        return collect($data)->map(fn(array $item) => MovieGenreData::fromArray($item));
    }
}
