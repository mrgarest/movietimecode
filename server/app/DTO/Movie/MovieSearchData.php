<?php

namespace App\DTO\Movie;

use App\Clients\TmdbClient;
use Carbon\Carbon;

class MovieSearchData
{
    public function __construct(
        public int $tmdbId,
        public int $releaseYear,
        public string $title,
        public string $originalTitle,
        public ?string $posterUrl = null,
        public ?int $id = null,
        public ?int $timecodeId = null,
        public ?float $ratingImdb = null,
    ) {}

    public static function fromTmdb(array $data): self
    {
        return new self(
            id: null,
            tmdbId: $data['id'],
            timecodeId: null,
            ratingImdb: null,
            releaseYear: Carbon::parse($data['release_date'])->year,
            title: $data['title'],
            originalTitle: $data['original_title'],
            posterUrl: TmdbClient::getImageUrl('w200', str_replace('/', '', $data['poster_path']))
        );
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'] ?? null,
            tmdbId: $data['tmdb_id'],
            ratingImdb: $data['rating_imdb'] ?? null,
            timecodeId: $data['timecode_id'] ?? null,
            releaseYear: $data['release_year'],
            title: $data['title'],
            originalTitle: $data['original_title'],
            posterUrl: $data['poster_url'] ?? null
        );
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'tmdb_id' => $this->tmdbId,
            'rating_imdb' => $this->ratingImdb,
            'timecode_id' => $this->timecodeId,
            'release_year' => $this->releaseYear,
            'title' => $this->title,
            'original_title' => $this->originalTitle,
            'poster_url' => $this->posterUrl,
        ];
    }
}
