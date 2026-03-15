<?php

namespace App\DTO;

use App\Enums\EventPlatform;
use App\Enums\EventType;
use App\Models\Event;
use Carbon\Carbon;

readonly class EventLogData
{
    public function __construct(
        public int $id,
        public EventType $type,
        public Carbon $createdAt,
        public string $deviceToken,
        public int|string|null $value = null,
        public ?string $description = null,
        public ?EventPlatform $platform = null
    ) {}

    public static function fromModel(Event $event, string $langCode): self
    {
        $data = match ($event->type) {
            EventType::CHECK_MOVIE => self::handleCheckMovie($event, $langCode),
            EventType::TIMECODE_USED => self::handleTimecodeUsed($event, $langCode),
        };

        return new self(
            id: $event->id,
            type: $event->type,
            platform: $event->platform,
            deviceToken: $event->device_token,
            value: $data['value'],
            description: $data['description'],
            createdAt: $event->created_at,
        );
    }

    private static function handleCheckMovie(Event $event, string $langCode): array
    {
        return [
            'value' => $event->movie?->tmdb_id,
            'description' => self::resolveMovieTitle($event->movie?->translations, $langCode),
        ];
    }

    private static function handleTimecodeUsed(Event $event, string $langCode): array
    {
        return [
            'value' => $event->movie?->tmdb_id,
            'description' => self::resolveMovieTitle($event->timecode?->movie?->translations, $langCode),
        ];
    }

    private static function resolveMovieTitle($translations, string $langCode): ?string
    {
        if (!$translations) {
            return null;
        }

        return $translations->firstWhere('lang_code', $langCode)?->title ?? $translations->firstWhere('lang_code', 'en')?->title;
    }
}
