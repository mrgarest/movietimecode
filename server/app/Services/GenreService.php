<?php

namespace App\Services;

use App\Models\Genre;
use Illuminate\Support\Collection;
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
}
