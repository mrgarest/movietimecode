<?php

namespace App\Cache;

class SeoCacheKey
{
    private const ROT = 'seo.';

    public static function movie(int $id): string
    {
        return  self::ROT . 'movie.' . $id;
    }
}
