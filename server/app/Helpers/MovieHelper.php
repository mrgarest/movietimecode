<?php

namespace App\Helpers;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class MovieHelper
{
    /**
     * Splitting a title into several titles, if there are several.
     *
     * @param string $title
     * @return Collection
     */
    public static function getTitles(string $title): Collection
    {
        return collect(explode(' / ', $title))
            ->map(fn($t) => trim($t))
            ->filter()
            ->prepend($title)
            ->unique()
            ->values();
    }

    /**
     * Movies released after this date are "new" (config movie.new_movie_years).
     */
    public static function newSince(): Carbon
    {
        return Carbon::now()->subYears(config('movie.new_movie_years'));
    }

    /**
     * Whether the movie is "new" by its release date.
     */
    public static function isNew(?Carbon $releaseDate): bool
    {
        return $releaseDate !== null && $releaseDate->gt(self::newSince());
    }
}
