<?php

namespace App\Http\Resources\Movie;

use App\Http\Resources\SuccessResource;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class MovieCheckResource extends SuccessResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $movie = $this->resource['movie'];
        $recommendation = $this->resource['recommendation'] ?? null;

        return [
            'id' => $movie->id,
            'tmdb_id' => $this->resource['tmdb_id'],
            'release' => $movie->release_date != null ? [
                'hazard' => $movie->release_date->greaterThan(Carbon::now()->subYears(4)),
                'release_date' => $movie->release_date->toDateString(),
            ] : null,
            'productions' => $this->formatCompanies($this->resource['productions']),
            'distributors' => $this->formatCompanies($this->resource['distributors']),
            'segments_count' => $this->resource['segmentsCount'],
            'ban_count' => $this->resource['sanctionCounts']->bans,
            'sitrike_count' => $this->resource['sanctionCounts']->strikes,
            'recommendation' => $this->when($recommendation, [
                'color' => $recommendation->color,
                'message' => $recommendation->message
            ]),
            'imdb' => $movie->imdb_id != null ? [
                'id' => $movie->imdb_id,
                'content_ratings' => $this->formatContentRatings(),
            ] : null,
            'aznude' => $movie->aznude_slug != null ? [
                'is_nude' => $movie->aznude_is_nude,
                'url' => "https://www.aznude.com/view/movie/{$movie->aznude_slug[0]}/{$movie->aznude_slug}.html",
            ] : null,
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
        $contentRatings = $this->resource['contentRatings'] ?? collect();

        if ($contentRatings->isEmpty()) return null;

        return $contentRatings->map(fn($rating) => [
            'content_id' => $rating->content->value,
            'level' => $rating->level
        ])->all();
    }
}
