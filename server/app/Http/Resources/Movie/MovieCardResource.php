<?php

namespace App\Http\Resources\Movie;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovieCardResource extends JsonResource
{
    // Disable the standard ‘data’ wrapper
    public static $wrap = null;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'tmdb_id' => $this->tmdbId,
            'rating_imdb' => $this->ratingImdb,
            'release_year' => $this->releaseYear,
            'title' => $this->title ?? $this->originalTitle,
            'poster_url' => $this->posterUrl
        ];
    }
}
