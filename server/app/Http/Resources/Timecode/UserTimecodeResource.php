<?php

namespace App\Http\Resources\Timecode;

use App\Clients\TmdbClient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserTimecodeResource extends JsonResource
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
        $translation = $this->movie->translations->first();
        $original = $this->movie->originalTranslation;
        $posterPath = $translation?->poster_path ?? $original?->poster_path;

        return [
            'id' => $this->id,
            'is_deleted' => $this->when($this->trashed(), true),
            'user' => [
                'id' => $this->user->id,
                'username' => $this->user->username
            ],
            'movie' => [
                'id' => $this->movie->id,
                'tmdb_id' => $this->movie->tmdb_id,
                'release_year' => Carbon::parse($this->movie->release_date)->year,
                'title' => $translation?->title ?? $original?->title,
                'poster_url' => $posterPath ? TmdbClient::getImageUrl('w200', str_replace('/', '', $posterPath)) : null,
            ],
            'segments_count' => (int) $this->segments_count,
            'used_count' => $this->used_count,
            'created_at' => $this->created_at->timestamp,
            'updated_at' => $this->updated_at->timestamp
        ];
    }
}
