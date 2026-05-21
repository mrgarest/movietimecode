<?php

namespace App\DTO\Aznude;

use Illuminate\Support\Str;

class AznudeSearchData
{
    public function __construct(
        public int $id,
        public bool $isNude,
        public int $releaseYear,
        public string $title,
        public string $slug,
        public string $url
    ) {}

    public static function fromAznude(array $data): self
    {
        $isNude = !empty($data['is_nsfw']);
        if (!$isNude && ($data['nudity_text'] ?? '') !== 'No Nudity') {
            $isNude = true;
        }

        return new self(
            id: $data['movie_id'],
            isNude: $isNude,
            releaseYear: $data['date'],
            title: $data['text'],
            slug: Str::of($data['url'] ?? '')->beforeLast('.html')->afterLast('/'),
            url: 'https://www.aznude.com' . $data['url']
        );
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            isNude: $data['is_nude'],
            releaseYear: $data['release_year'],
            title: $data['title'],
            slug: $data['slug'],
            url: $data['url']
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'is_nude' => $this->isNude,
            'release_year' => $this->releaseYear,
            'title' => $this->title,
            'slug' => $this->slug,
            'url' => $this->url
        ];
    }
}
