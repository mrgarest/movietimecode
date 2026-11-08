<?php

namespace App\Cache;

class GenreCacheKey
{
    private const ROT = 'genre.';

    public static function forMovie(int $movieId, string $langCode): string
    {
        return self::ROT . 'forMovie.' . $movieId . '.' . $langCode;
    }
}
