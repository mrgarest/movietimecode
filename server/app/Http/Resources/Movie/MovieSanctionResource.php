<?php

namespace App\Http\Resources\Movie;

use App\Clients\TmdbClient;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MovieSanctionResource extends JsonResource
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
        $approvedUser = $this->approvedUser;

        return [
            'username' => $this->username,
            'reports' => $this->reports->map(fn($report) => [
                'id' => $report->id,
                'type' => $report->type,
                'reason' => $report->reason,
                'comment' => $report->comment,
                'occurred_at' => $report->occurred_at->format('Y-m-d'),
                'created_at' => $report->created_at->timestamp
            ]),
            'movie' => [
                'id' => $this->movie->id,
                'release_year' => Carbon::parse($this->movie->release_date)->year,
                'title' => $translation?->title ?? $original?->title,
                'poster_url' => $posterPath ? TmdbClient::getImageUrl('w200', str_replace('/', '', $posterPath)) : null,
            ],
            'approved_by' => $this->approved_by ? [
                'id' => $approvedUser->id,
                'username' => $approvedUser->username,
            ] : null,
            'approved_at' => $this->approved_at?->timestamp,
            'last_report_at' => Carbon::parse($this->last_report_at)->timestamp
        ];
    }
}
