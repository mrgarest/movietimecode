<?php

namespace App\Cache;

class GenreCacheKey
{
    private const ROT = 'genre.';

    public static function forMovie(int $movieId, string $langCode): string
    {
        return self::ROT . 'forMovie.' . $movieId . '.' . $langCode;
    }

    public static function bySlug(string $slug, string $langCode): string
    {
        return self::ROT . 'bySlug.' . $slug . '.' . $langCode;
    }

    public static function withTimecodes(string $langCode): string
    {
        return self::ROT . 'withTimecodes.' . $langCode;
    }
}
