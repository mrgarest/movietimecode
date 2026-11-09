<?php

namespace App\DTO\Movie;

use App\Helpers\Language;
use App\Models\Genre;

class MovieGenreData
{
    public function __construct(
        public string $slug,
        public string $name,
    ) {}

    /**
     * Create from a genre with loaded translations (the language, falling back to English).
     */
    public static function fromModel(Genre $genre, ?string $langCode = null): self
    {
        $langCode ??= Language::default();

        $translation = $genre->translations->firstWhere('lang_code', $langCode)
            ?? $genre->translations->firstWhere('lang_code', Language::fallback());

        return new self(
            slug: $genre->slug,
            name: $translation?->name ?? $genre->slug,
        );
    }

    public static function fromArray(array $data): self
    {
        return new self(
            slug: $data['slug'],
            name: $data['name'],
        );
    }

    public function toArray(): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
        ];
    }
}
