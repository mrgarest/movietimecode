<?php

namespace App\Cache;

use App\Enums\RefreshMovieDataType;

class MovieCacheKey
{
    private const ROT = 'movie.';

    public static function searchTmdb(string $title, int $page = 1, ?int $year = null): string
    {
        return  self::ROT . 'search.tmdb.' . md5($title) . '.' . $page . ($year != null ? '.' . $year : '');
    }

    public static function preview(string $title, ?int $year = null): string
    {
        return  self::ROT . 'search.' . md5($title) . ($year != null ? '.' . $year : '');
    }

    public static function externalTmdbId(int $id): string
    {
        return  self::ROT . 'external.tmdb.' . $id;
    }

    public static function id(int $id): string
    {
        return  self::ROT . 'id.' . $id;
    }

    public static function translations(int $id): string
    {
        return  self::ROT . 'translations.' . $id;
    }

    public static function latestChecked(string $langCode): string
    {
        return  self::ROT . 'latest.checked.' . $langCode;
    }

    public static function latestWithTimecodes(int $page, int $limit, string $langCode, string $filtersKey): string
    {
        return  self::ROT . 'latest.timecodes.' . $page . '.' . $limit . '.' . $langCode . '.' . $filtersKey;
    }

    public static function refreshData(int $movieId, RefreshMovieDataType $type): string
    {
        return self::ROT . 'refresh_data.' . $movieId . '.' . $type->value;
    }
}
