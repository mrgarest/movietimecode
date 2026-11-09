<?php

namespace App\DTO\Movie;

use App\Enums\MovieRecommendation;
use App\Enums\MovieSort;

/**
 * Filters of the movie list with timecodes.
 */
class MovieListFilterData
{
    /**
     * @param string[] $genres Genre slugs, the movie must have all of them
     * @param MovieRecommendation[] $recommendations The movie must have one of them
     */
    public function __construct(
        public array $genres = [],
        public array $recommendations = [],
        public ?int $yearFrom = null,
        public ?int $yearTo = null,
        public ?float $rating = null,
        public MovieSort $sort = MovieSort::ADDED,
    ) {
        $this->genres = collect($genres)->unique()->sort()->values()->all();

        $this->recommendations = collect($recommendations)
            ->unique(fn(MovieRecommendation $r) => $r->value)
            ->sortBy(fn(MovieRecommendation $r) => $r->value)
            ->values()
            ->all();

        // The range is given in the wrong order
        if ($this->yearFrom !== null && $this->yearTo !== null && $this->yearFrom > $this->yearTo) {
            [$this->yearFrom, $this->yearTo] = [$this->yearTo, $this->yearFrom];
        }
    }

    /**
     * Create from the query string. Invalid values are ignored.
     */
    public static function fromQuery(array $query): self
    {
        return new self(
            genres: self::parseList($query['genre'] ?? null, config('movie.list_filters.max_genres')),
            recommendations: collect(self::parseList($query['recommendation'] ?? null, 3))
                ->map(fn(string $value) => MovieRecommendation::tryFrom($value))
                ->filter()
                ->all(),
            yearFrom: self::parseYear($query['year_from'] ?? null),
            yearTo: self::parseYear($query['year_to'] ?? null),
            rating: self::parseFloat($query['rating'] ?? null, 0, 10),
            sort: is_string($query['sort'] ?? null)
                ? (MovieSort::tryFrom($query['sort']) ?? MovieSort::ADDED)
                : MovieSort::ADDED,
        );
    }

    /**
     * Unique key of the filters for the cache.
     */
    public function cacheKey(): string
    {
        return md5(json_encode($this->toArray()));
    }

    public function toArray(): array
    {
        return [
            'genres' => $this->genres,
            'recommendations' => array_map(fn(MovieRecommendation $r) => $r->value, $this->recommendations),
            'year_from' => $this->yearFrom,
            'year_to' => $this->yearTo,
            'rating' => $this->rating,
            'sort' => $this->sort->value,
        ];
    }

    /**
     * Parse a comma-separated list.
     *
     * @return string[]
     */
    private static function parseList(mixed $value, int $limit): array
    {
        if (!is_string($value) || $value === '') return [];

        return collect(explode(',', $value))
            ->map(fn($item) => trim($item))
            ->filter(fn($item) => $item !== '' && strlen($item) <= 64)
            ->unique()
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * Release year within config movie.list_filters.
     */
    private static function parseYear(mixed $value): ?int
    {
        $value = filter_var($value, FILTER_VALIDATE_INT);
        $min = config('movie.list_filters.min_year');
        $max = config('movie.list_filters.max_year');

        return $value !== false && $value >= $min && $value <= $max ? $value : null;
    }

    private static function parseFloat(mixed $value, float $min, float $max): ?float
    {
        $value = filter_var($value, FILTER_VALIDATE_FLOAT);

        return $value !== false && $value >= $min && $value <= $max ? $value : null;
    }
}
