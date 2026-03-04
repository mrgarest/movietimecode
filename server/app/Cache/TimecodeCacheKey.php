<?php

namespace App\Cache;

class TimecodeCacheKey
{
    private const ROT = 'timecode.';


    public static function authors(int $movieId): string
    {
        return  self::ROT . 'authors.' . $movieId;
    }

    public static function timecodes(int $timecodeId): string
    {
        return  self::ROT . $timecodeId;
    }

    public static function maxSegmentsCount(int $movieId): string
    {
        return  self::ROT . 'max_segments_count.' .$movieId;
    }
}
