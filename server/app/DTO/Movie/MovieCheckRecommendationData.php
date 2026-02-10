<?php

namespace App\DTO\Movie;

use Illuminate\Support\Facades\Lang;

class MovieCheckRecommendationData
{
    public function __construct(
        public string $color,
        public string $message,
    ) {}

    public static function fromLang(string $color, string $key, string $langCode): self
    {
        return new self(
            color: $color,
            message: Lang::get('checkRecommendation' . $key, [], $langCode),
        );
    }
}
