<?php

namespace App\Services;

use App\Cache\EventCacheKey;
use App\DTO\EventLogData;
use App\Enums\EventPlatform;
use App\Enums\EventType;
use App\Models\Event;
use App\Models\MovieTimecode;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Pagination\LengthAwarePaginator;

class EventService
{
    /**
     * Store a new event.
     *
     * @param string $deviceToken
     * @param EventType $type
     * @param EventPlatform $platform
     * @param int|string $value
     */
    public function store(string $deviceToken, EventType $type, EventPlatform $platform, int|string $value): void
    {
        // Check cache to prevent duplicate events
        $cacheKey = EventCacheKey::store($deviceToken, $type, $value);
        if (Cache::has($cacheKey)) return;

        $now = Carbon::now();
        // Insert the event into the database
        Event::insert([
            'device_token' => $deviceToken,
            'type' => $type->value,
            'platform' => $platform,
            'value' => $value,
            'created_at' => $now,
            'updated_at' => $now
        ]);

        // Cache the event to prevent duplicates
        Cache::put($cacheKey, true, Carbon::now()->addMinutes(10));

        // Additional actions based on event type
        match ($type) {
            EventType::TIMECODE_USED => MovieTimecode::find((int)$value)->increment('used_count'),
            default => null,
        };
    }


    /**
     * Get a list of recent events
     *
     * @param int $page
     * @param string $langCode
     * @return LengthAwarePaginator
     */
    public function getLatestPaginated(
        int $page = 1,
        string $langCode = 'uk',
    ): LengthAwarePaginator {
        return Event::query()
            ->with([
                'movie.translations' => fn($q) => $q->whereIn('lang_code', [$langCode, 'en']),
                'timecode.movie.translations' => fn($q) => $q->whereIn('lang_code', [$langCode, 'en']),
            ])
            ->orderByDesc('created_at')
            ->paginate(20, ['*'], 'page', $page)
            ->through(fn(Event $event) => EventLogData::fromModel($event, $langCode));
    }
}
