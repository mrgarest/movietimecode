<?php

namespace App\Http\Resources\Movie;

use App\Clients\TmdbClient;
use App\Http\Resources\SuccessResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class MovieDetailResource extends SuccessResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $movie = $this->resource['movie'];
        $translation = $this->resource['translation'];
        $recommendation = $this->resource['recommendation'] ?? null;

        return [
            'id' => $movie->id,
            'tmdb_id' => $this->resource['tmdb_id'],
            'rating_imdb' => $movie->rating_imdb,
            'title' => $translation->title ?? $movie->title,
            'original_title' => $movie->title,
            'release' => $movie->release_date != null ? [
                'hazard' => $movie->release_date->greaterThan(Carbon::now()->subYears(4)),
                'release_date' => $movie->release_date->toDateString(),
            ] : null,
            'productions' => $this->formatCompanies($this->resource['productions']),
            'distributors' => $this->formatCompanies($this->resource['distributors']),
            'ban_count' => $this->resource['sanctionCounts']->bans,
            'sіtrike_count' => $this->resource['sanctionCounts']->strikes,
            'recommendation' => $this->when($recommendation, [
                'color' => $recommendation->color,
                'message' => $recommendation->message
            ]),
            'imdb' => $this->resource['imdb']['id'] != null ? [
                'id' => $this->resource['imdb']['id'],
                'content_ratings' => $this->formatContentRatings(),
            ] : null,
            'poster_url' => TmdbClient::getImageUrl('w500', $translation->poster_path ?? $movie->poster_path),
            'backdrop_url' => TmdbClient::getImageUrl('w500',$translation->backdrop_path ?? $movie->backdrop_path)
        ];
    }

    private function formatCompanies(Collection $companies): ?array
    {
        if ($companies->isEmpty()) return null;

        return $companies->map(fn($company) => [
            'id' => $company->id,
            'hazard_level' => $company->hazardLevel,
            'name' => $company->name
        ])->all();
    }

    private function formatContentRatings(): ?array
    {
        $contentRatings = $this->resource['imdb']['content_ratings'] ?? collect();

        if ($contentRatings->isEmpty()) return null;

        return $contentRatings->map(fn($rating) => [
            'content_id' => $rating->content->value,
            'level' => $rating->level
        ])->all();
    }
}
