<?php

namespace App\Services;

use App\Cache\TimecodeCacheKey;
use App\Clients\TmdbClient;
use App\DTO\Timecode\Editor\TimecodeEditData;
use App\DTO\Timecode\Editor\TimecodeSegmentEditData;
use App\DTO\Timecode\TimecodeAuthorData;
use App\DTO\Timecode\TimecodeData;
use App\DTO\Timecode\TimecodeEditorData;
use App\DTO\Timecode\TimecodeSegmentData;
use App\Exceptions\ApiException;
use App\Models\MovieTimecode;
use App\Models\MovieTimecodeSegment;
use App\Models\MovieTimecodeTwitchContentClassification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TimecodeService
{
    /**
     * Returns the maximum number of segments among all users for a specific movie.
     * If there are no segments, returns null.
     * 
     * @param int $movieId
     * @return int|null
     */
    public function getMaxSegmentsCount(int $movieId): ?int
    {
        return Cache::remember(TimecodeCacheKey::maxSegmentsCount($movieId), Carbon::now()->addMinutes(5), function () use ($movieId) {
            $result = MovieTimecode::query()
                ->where('movie_id', $movieId)
                ->withCount('segments')
                ->orderByDesc('segments_count')
                ->first();

            return $result ? (int) $result->segments_count : null;
        });
    }

    /**
     * Get a collection of timecode authors with timecode information.
     *
     * @param int $movieId
     * @return Collection
     */
    public function getAuthors(int $movieId): Collection
    {
        $data = Cache::remember(TimecodeCacheKey::authors($movieId), Carbon::now()->addMinutes(5), function () use ($movieId) {
            return MovieTimecode::movieId($movieId)
                ->whereHas('user', fn($u) => $u->whereNull('deleted_at'))
                ->withCount('segments')
                ->with('user:id,username')
                ->orderByDesc('used_count')
                ->get()
                ->map(fn(MovieTimecode $tc) => TimecodeAuthorData::fromModel($tc)->toArray())
                ->all();
        });

        return collect($data)->map(fn(array $item) => TimecodeAuthorData::fromArray($item));
    }

    /**
     * Get timecodes for a movie from a specific author.
     *
     * @param int $timecodeId
     * @return TimecodeData|null
     */
    public function getTimecodes(int $timecodeId): ?TimecodeData
    {
        $data = Cache::remember(TimecodeCacheKey::timecodes($timecodeId), now()->addMinutes(10), function () use ($timecodeId) {
            $timecode = MovieTimecode::with(['twitchContentClassification', 'segments' => function ($query) {
                $query->orderBy('start_time');
            }])->find($timecodeId);

            if (!$timecode) {
                return null;
            }

            return [
                'id' => $timecode->id,
                'movie_id' => $timecode->movie_id,
                'content_classifications' => $timecode->twitchContentClassification->pluck('value')->toArray(),
                'segments' => $timecode->segments->map(fn($s) => TimecodeSegmentData::toArrayFromModel($s))->toArray()
            ];
        });

        if (!isset($data['segments'])) return null;

        return new TimecodeData(
            id: $data['id'],
            movieId: $data['movie_id'],
            contentClassifications: $data['content_classifications'] ?? null,
            segments: collect($data['segments'])->map(fn($s) => TimecodeSegmentData::fromArray($s))
        );
    }

    /**
     * Adds new timecodes to the database under a specific user if they have not previously added them to a specific movie.
     *
     * @param TimecodeEditData $data
     * @param int $tmdbId
     * @param User $user
     * @param MovieService $movieService
     */
    public function new(TimecodeEditData $data, int $tmdbId, User $user, MovieService $movieService)
    {
        // Get the movie model
        $movie = $movieService->getOrImport($tmdbId);

        if (!$movie) throw ApiException::notFound();

        // If timecodes have already been added earlier by this user, we return an error. 
        $existingTimecode = MovieTimecode::withTrashed()
            ->userId($user->id)
            ->movieId($movie->id)
            ->first();

        if ($existingTimecode) {
            if (!$existingTimecode->trashed()) throw ApiException::timecodesAlreadyExist();
            $existingTimecode->forceDelete();
        }

        DB::transaction(function () use ($data, $user, $movie) {
            $timecode = MovieTimecode::create([
                'user_id' => $user->id,
                'movie_id' => $movie->id,
                'duration' => $data->duration
            ]);

            $now = Carbon::now();
            if ($data->segments->isNotEmpty()) {
                $segmentData = $data->segments->map(function (TimecodeSegmentEditData $segment) use ($user, $movie, $timecode, $now) {
                    return [
                        'user_id' => $user->id,
                        'movie_id' => $movie->id,
                        'timecode_id' => $timecode->id,
                        'tag_id' => $segment->tag->value,
                        'start_time' => $segment->startTime,
                        'end_time' => $segment->endTime,
                        'description' => $segment->description ? trim($segment->description) : null,
                        'created_at' => $now,
                        'updated_at' => $now
                    ];
                })->all();
                MovieTimecodeSegment::insert($segmentData);
            }

            if (!empty($data->contentClassifications)) {
                $classificationData = collect($data->contentClassifications)->map(function ($value) use ($user, $movie, $timecode, $now) {
                    return [
                        'user_id' => $user->id,
                        'movie_id' => $movie->id,
                        'timecode_id' => $timecode->id,
                        'value' => $value,
                        'created_at' => $now,
                        'updated_at' => $now
                    ];
                })->toArray();
                MovieTimecodeTwitchContentClassification::insert($classificationData);
            }
        });

        // Clearing the timecode cache
        Cache::forget(TimecodeCacheKey::authors($movie->id));

        // Sending a notification about a new timecodes.
        (new TelegramNotificationService())->newTimecodesAdded($user, $movie, $data->segments->count());
    }

    /**
     * Editing existing timecodes for a movie.
     *
     * @param TimecodeEditData $data
     * @param User $user
     * @param int $timecodeId
     * @param MovieService $movieService
     */
    public function edit(TimecodeEditData $data, User $user, int $timecodeId)
    {
        $timecode = MovieTimecode::when($user->isAdmin(), function ($query) {
            return $query->withTrashed();
        })->with(['segments', 'twitchContentClassification'])->find($timecodeId);

        if (!$timecode) throw ApiException::notFound();

        if ($user->id !== $timecode->user_id && !$user->isAdmin()) throw ApiException::permissionDenied();

        DB::transaction(function () use ($user, $timecode, $data) {
            // Recovery if timecodes have been deleted
            if ($timecode->trashed() && $user->isAdmin()) {
                $timecode->restore();
            }

            // Update the duration if it has changed
            if ($timecode->duration !== $data->duration) {
                $timecode->update(['duration' => $data->duration]);
            }


            // --- SEGMENT UPDATES ---
            $existingSegments = $timecode->segments;

            // Get the IDs of segments that arrived in data (for updating)
            $dtoSegmentIds = $data->segments->map(fn($s) => $s->id)->filter()->toArray();

            // Deletion of segments that are not in the new list
            $idsToDelete = $existingSegments->pluck('id')->diff($dtoSegmentIds);
            if ($idsToDelete->isNotEmpty()) {
                MovieTimecodeSegment::whereIn('id', $idsToDelete)->delete();
            }

            // Updates and creation
            $now = Carbon::now();
            $newSegments = [];

            /** @var TimecodeSegmentEditData $segment */
            foreach ($data->segments as $segment) {

                // Data array for creation and updating
                $item = [
                    'tag_id' => $segment->tag->value,
                    'start_time' => $segment->startTime,
                    'end_time' => $segment->endTime,
                    'description' => $segment->description ? trim($segment->description) : null
                ];

                if ($segment->id) {
                    // Updating existing segments
                    MovieTimecodeSegment::where('id', $segment->id)->update($item);
                } else {
                    // Forming an array for mass creation
                    $newSegments[] = array_merge([
                        'user_id' => $timecode->user_id,
                        'movie_id' => $timecode->movie_id,
                        'timecode_id' => $timecode->id,
                        'action_id' => null,
                        'created_at' => $now,
                        'updated_at' => $now
                    ], $item);
                }
            }

            // Mass creation of new segments
            if (!empty($newSegments)) {
                MovieTimecodeSegment::insert($newSegments);
            }
            // -------------------------------------------


            // --- CONTENT CLASSIFICATION UPDATE FOR TWITCH ---
            $existingClassifications = $timecode->twitchContentClassification;
            $existingValues = $existingClassifications->pluck('value')->toArray();
            $newValues = $data->contentClassifications ?? [];

            // Decide which ones to delete
            $valuesToDelete = array_diff($existingValues, $newValues);
            if (!empty($valuesToDelete)) {
                MovieTimecodeTwitchContentClassification::timecodeId($timecode->id)
                    ->whereIn('value', $valuesToDelete)
                    ->delete();
            }

            // Deciding which ones to add
            $valuesToAdd = array_diff($newValues, $existingValues);
            if (!empty($valuesToAdd)) {
                $now = now();
                $insertData = array_map(fn($val) => [
                    'user_id' => $timecode->user_id,
                    'movie_id' => $timecode->movie_id,
                    'timecode_id' => $timecode->id,
                    'value' => $val,
                    'created_at' => $now,
                    'updated_at' => $now
                ], $valuesToAdd);

                MovieTimecodeTwitchContentClassification::insert($insertData);
            }
            // -------------------------------------------


            // Clearing the timecode cache
            Cache::forget(TimecodeCacheKey::authors($timecode->movie_id));
            Cache::forget(TimecodeCacheKey::timecodes($timecode->id));
        });
    }

    /**
     * Get information for the timecode editor.
     *
     * @param User $user
     * @param int $timecodeId
     * @param string $langCode
     * @return TimecodeEditorData|null
     */
    public function editor(User $user, int $timecodeId, string $langCode = 'uk'): ?TimecodeEditorData
    {
        $timecode = MovieTimecode::when($user->isAdmin(), function ($query) {
            return $query->withTrashed();
        })->with([
            'segments' => fn($q) => $q->orderBy('start_time'),
            'twitchContentClassification',
            'movie.translations' => function ($q) use ($langCode) {
                $q->whereIn('lang_code', [$langCode, 'en']);
            }
        ])->find($timecodeId);

        if (!$timecode) return null;

        if ($user->id !== $timecode->user_id && !$user->isAdmin()) throw ApiException::permissionDenied();

        $movie = $timecode->movie;

        // Determine translation (Current language -> English)
        $translation = $movie->translations->firstWhere('lang_code', $langCode) ?? $movie->translations->firstWhere('lang_code', 'en');

        $posterPath = $translation?->poster_path ?? $movie->poster_path;

        return new TimecodeEditorData(
            id: $timecode->id,
            movieId: $timecode->movie_id,
            duration: $timecode->duration,
            releaseYear: $movie->release_date?->year,
            title: $translation?->title ?? $movie->title,
            originalTitle: $movie->title,
            posterUrl: $posterPath ? TmdbClient::getImageUrl('w200', str_replace('/', '', $posterPath)) : null,
            contentClassifications: $timecode->twitchContentClassification->pluck('value')->toArray(),
            segments: $timecode->segments->map(fn($s) => TimecodeSegmentData::fromModel($s))
        );
    }

    /**
     * Deleting timecodes.
     *
     * @param User $user
     * @param int $timecodeId
     * @param bool $force
     * @return bool
     */
    public function delete(User $user, int $timecodeId, bool $force = false): bool
    {
        $timecode = MovieTimecode::withTrashed()->find($timecodeId);
        if (!$timecode) return true;

        if ($user->id !== $timecode->user_id && !$user->isAdmin()) throw ApiException::permissionDenied();

        $movieId = $timecode->movie_id;

        if ($force && $user->isAdmin()) {
            $result = $timecode->forceDelete();
        } else {
            $result = $timecode->delete();
        }

        // Clearing the timecode cache
        Cache::forget(TimecodeCacheKey::authors($movieId));
        Cache::forget(TimecodeCacheKey::timecodes($timecode->id));

        return $result;
    }

    /**
     * Get the latest timecodes with movie information.
     *
     * @param int $page
     * @param string $langCode
     * @param User|null $user
     * @param string|null $sortBy
     * @param bool $canSeeTrashed
     * @return LengthAwarePaginator
     */
    public function getLatestPaginated(int $page = 1, string $langCode = 'uk', ?User $user = null, string $sortBy = 'latest', bool $canSeeTrashed = false): LengthAwarePaginator
    {
        return MovieTimecode::query()
            ->withCount('segments')
            ->when($canSeeTrashed, function ($query) {
                return $query->withTrashed();
            })
            ->with([
                'user:id,username',
                'movie' => function ($query) use ($langCode) {
                    $query->with(['translations' => function ($q) use ($langCode) {
                        $q->where('lang_code', $langCode);
                    }]);
                },
            ])
            ->when($user, function ($query, $user) {
                return $query->userId($user->id);
            })
            ->when($sortBy, function ($query) use ($sortBy) {
                return match ($sortBy) {
                    'segments' => $query->orderByDesc('segments_count'),
                    'usage' => $query->orderByDesc('used_count'),
                    default => $query->orderByDesc('created_at'),
                };
            })
            ->paginate(20, ['*'], 'page', $page);
    }
}
