<?php

namespace App\Services;

use App\Cache\MovieSanctionCacheKey;
use App\DTO\Movie\MovieSanctionCountData;
use App\Enums\SanctionReason;
use App\Enums\SanctionType;
use App\Exceptions\ApiException;
use App\Models\Movie;
use App\Models\MovieSanction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MovieSanctionService
{
    /**
     * Get the count of bans/strikes.
     * 
     * @param int $movieId
     * @return MovieSanctionCountData
     */
    public function getCounts(int $movieId): MovieSanctionCountData
    {
        return MovieSanctionCountData::fromArray(Cache::remember(MovieSanctionCacheKey::counts($movieId), Carbon::now()->addMinutes(5), function () use ($movieId) {
            $targetTypes = [
                SanctionType::BANNED->value,
                SanctionType::STRIKE->value
            ];
            $results = MovieSanction::movieId($movieId)
                ->approved()
                ->whereIn('type', $targetTypes)
                ->select('type', DB::raw('count(*) as count'))
                ->groupBy('type')
                ->pluck('count', 'type');

            return (new MovieSanctionCountData(
                bans: $results[$targetTypes[0]] ?? 0,
                strikes: $results[$targetTypes[1]] ?? 0,
            ))->toArray();
        }));
    }

    /**
     * Creates a movie sanction report for the specified user.
     *
     * @param string $deviceToken
     * @param string $username
     * @param SanctionType $type
     * @param SanctionReason|null $reason
     * @param int|null $movieId
     * @param int|null $tmdbId
     * @param string|null $comment
     * @param Carbon|null $occurredAt
     * @param UploadedFile|null $file
     *
     * @return MovieSanction
     */
    public function report(
        string $deviceToken,
        string $username,
        SanctionType $type,
        ?SanctionReason $reason,
        ?int $movieId = null,
        ?int $tmdbId = null,
        ?string $comment = null,
        ?Carbon $occurredAt = null,
        ?UploadedFile $file = null,
    ): MovieSanction {
        if (!$movieId && !$tmdbId) throw ApiException::badRequest();

        // Checking whether a movie exists by a given ID
        $movieExists = $movieId && Movie::find($movieId)->exists();

        // If the movie is not found, then search by TMDB ID
        if (!$movieExists && $tmdbId) $movieId = app(MovieService::class)->getOrImport($tmdbId)?->id;

        // If the movie ID cannot be found, return an error
        if (!$movieExists && !$movieId) throw ApiException::notFound();

        $username = Str::lower(trim($username));

        // Duplicate check
        $exists = MovieSanction::movieId($movieId)
            ->username($username)
            ->where(function ($query) use ($deviceToken) {
                $query->whereNotNull('approved_at')
                    ->orWhere('device_token', $deviceToken);
            })
            ->exists();
        if ($exists) throw ApiException::duplicate();

        // Data storage
        return MovieSanction::create([
            'movie_id' => $movieId,
            'device_token' => $deviceToken,
            'username' => $username,
            'type' => $type,
            'reason' => $reason,
            'comment' => $comment ? trim($comment) : null,
            'file_name' => null,
            'occurred_at' => $occurredAt,
        ]);
    }

    /**
     * Approves a movie sanction report.
     *
     * @param User $user
     * @param MovieSanction $sanction
     */
    public function approve(User $user, MovieSanction $sanction): void
    {
        $sanction->update([
            'approved_at' => Carbon::now(),
            'approved_by' => $user->id
        ]);

        // Remove all other pending reports for the same user and movie
        MovieSanction::movieId($sanction->movie_id)
            ->username($sanction->username)
            ->where('id', '!=', $sanction->id)
            ->delete();
    }

    /**
     * Get a list of recent sanctions.
     *
     * @param int $page
     * @param string $langCode
     * @param string|null $filter Options: all, approved, unapproved.
     * @return LengthAwarePaginator
     */
    public function getLatestPaginated(
        int $page = 1,
        string $langCode = 'uk',
        ?string $filter = 'unapproved'
    ): LengthAwarePaginator {
        $query = MovieSanction::query()
            ->select([
                'movie_id',
                'username',
                DB::raw('max(created_at) as last_report_at'),
                DB::raw('max(approved_at) as approved_at'),
                DB::raw('max(approved_by) as approved_by')
            ])
            ->with([
                'approvedUser:id,username',
                'movie.translations' => fn($q) => $q
                    ->whereIn('lang_code', [$langCode, 'en'])
                    ->orderByRaw('lang_code = ? DESC', [$langCode]),
                'movie.originalTranslation',
            ]);

        $query->when($filter === 'approved', fn($q) => $q->whereNotNull('approved_at'));
        $query->when($filter === 'unapproved', fn($q) => $q->whereNull('approved_at'));

        $paginator = $query->groupBy('movie_id', 'username')
            ->orderByDesc('last_report_at')
            ->paginate(20, ['*'], 'page', $page);

        $groups = $paginator->getCollection();
        if ($groups->isEmpty()) return $paginator;

        $reports = MovieSanction::query()
            ->whereIn('movie_id', $groups->pluck('movie_id')->unique())
            ->whereIn('username', $groups->pluck('username')->unique())
            ->orderByDesc('created_at')
            ->get()
            ->groupBy(fn($report) => $report->movie_id . '|' . $report->username);

        $groups->each(function ($group) use ($reports) {
            $group->setRelation('reports', $reports->get($group->movie_id . '|' . $group->username, collect()));
        });

        return $paginator;
    }
}
