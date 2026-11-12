<?php

namespace App\Services;

use App\Helpers\Language;
use App\Cache\MovieCacheKey;
use App\Clients\TmdbClient;
use App\DTO\Movie\MovieCompanData;
use App\DTO\Movie\MovieListFilterData;
use App\DTO\Movie\MoviePreviewData;
use App\DTO\Movie\MovieSearchData;
use App\DTO\Movie\MovieCheckRecommendationData;
use App\DTO\Movie\MovieSanctionCountData;
use App\Enums\EventType;
use App\Enums\MovieCompanyRole;
use App\Enums\MovieRecommendation;
use App\Enums\MovieSort;
use App\Enums\SanctionType;
use App\Enums\RefreshMovieDataType;
use App\Enums\StorageId;
use App\Exceptions\ApiException;
use App\Helpers\MovieHelper;
use App\Jobs\AddImagesToMovie;
use App\Jobs\AddVideosToMovie;
use App\Models\Event;
use App\Models\Movie;
use App\Models\MovieCompany;
use App\Models\MovieTranslation;
use App\Services\IMDB\ImdbService;
use App\Services\IMDB\ImdbParserService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

class MovieService
{
    /**
     * Checking whether the language of the movie is blacklisted.
     *
     * @param string $language
     * @return bool
     */
    public function isBlacklistLanguage(string $language): bool
    {
        return in_array(strtolower($language), ['ru', 'by']);
    }

    /**
     * Get a list of movies from TMDB based on specified parameters.
     *
     * @param string $title
     * @param int $page
     * @param int|null $year
     * @param array $with
     * @return Collection
     */
    public function searchTmdb(string $title, int $page = 1, ?int $year = null, $with = []): Collection
    {
        $client = app(TmdbClient::class);

        $titles = MovieHelper::getTitles($title);

        // Get info about the movie from the client.
        $searchMovies = Cache::remember(MovieCacheKey::searchTmdb($title, $page, $year), Carbon::now()->addMinutes(10), function () use ($client, $titles, $page, $year) {
            foreach ($titles as $t) {
                $result = $client->searchMovie($t, Language::tmdbLocale(Language::default()), $page, $year);

                if (!empty($result['results'])) {
                    return $result['results'];
                }
            }
            return [];
        });

        // If no movies are found, return an empty array
        if (empty($searchMovies)) return collect();

        // Creating a collection with movies
        $movies = collect($searchMovies)
            // Filter movies by language and release date
            ->filter(function ($value) {
                // Checking if a release date exists
                if (!isset($value['release_date']) || empty($value['release_date'])) {
                    return false;
                }

                // Language Check
                if ($this->isBlacklistLanguage($value['original_language'])) {
                    return false;
                }

                // Check if the release date has already arrived
                return Carbon::parse($value['release_date'])->isPast() || Carbon::parse($value['release_date'])->isToday();
            })
            ->map(fn($value) => MovieSearchData::fromTmdb($value))
            ->values();

        if (!$movies->isNotEmpty()) return $movies;

        $needsMovieId = in_array('movieId', $with);
        $needsTimecodeId = in_array('timecodeId', $with);

        if (($needsMovieId || $needsTimecodeId)) {
            $user = $needsTimecodeId ? auth('api')->user() : null;
            $tmdbIds = $movies->pluck('tmdbId')->toArray();

            // Searching for movies in the database by TMDB IDs and loading timecodes if necessary
            $dbMovies = Movie::query()
                ->select(['id', 'tmdb_id'])
                ->tmdbIds($tmdbIds)
                ->when($needsTimecodeId && $user, function ($q) use ($user) {
                    $q->with(['timecodes' => fn($q) => $q->select(['id', 'movie_id', 'user_id'])->userId($user->id)]);
                })
                ->get()
                ->keyBy(fn($m) => $m->tmdb_id);

            $movies->each(function (MovieSearchData $item) use ($user, $dbMovies, $needsMovieId, $needsTimecodeId) {
                if ($movie = $dbMovies->get($item->tmdbId)) {

                    if ($needsMovieId) {
                        $item->id = $movie->id;
                    }

                    if ($needsTimecodeId && $user && $movie->relationLoaded('timecodes')) {
                        $item->timecodeId = $movie->timecodes->first()?->id;
                    }
                }
            });
        }

        return $movies;
    }

    /**
     * Get information about the movie from the database. If the movie is not in the database, import it.
     *
     * @param int $tmdbId
     * @param string|null $ip
     * @param bool $import
     * 
     * @return Movie|null
     */
    public function getOrImport(int $tmdbId, ?string $ip = null, bool $import = true): ?Movie
    {
        $cacheKey = MovieCacheKey::externalTmdbId($tmdbId);

        // Convert the array back to a model object without querying the database
        if ($movieData = Cache::get($cacheKey)) return Movie::fromCache($movieData);

        $movie = Movie::tmdbId($tmdbId)->first();

        if ($movie) {
            Cache::put($cacheKey, $movie->toCache(), Carbon::now()->addMinutes(5));
            return $movie;
        }

        // If the movie is not in the database and the import flag is false, return null
        if (!$import) return null;

        // If an IP address is available, a strict limit is applied to the number of requests to the external API
        if ($ip) {
            $rateKey = 'importFromTmdb:rate:' . $ip;
            $banKey  = 'importFromTmdb:ban:' . $ip;

            // Ban check
            if (RateLimiter::tooManyAttempts($banKey, 1)) {
                throw ApiException::tooManyRequests();
            }

            // Checking the limit of 20 attempts in 60 seconds
            if (RateLimiter::tooManyAttempts($rateKey, 20)) {
                // Activate the ban for 5 minutes
                RateLimiter::hit($banKey, 300);

                // Clearing the attempt counter
                RateLimiter::clear($rateKey);

                throw ApiException::tooManyRequests();
            }

            RateLimiter::hit($rateKey, 60);
        }

        return app()->call([$this, 'importFromTmdb'], ['tmdbId' => $tmdbId]);
    }

    /**
     * Get information about the movie from sources and add the movie to the database.
     *
     * @param TmdbClient $tmdbClient
     * @param ImdbService $imdbService
     * @param ImdbParserService $imdbParserService
     * @param CompanyService $companyService
     * @param AznudeService $aznudeService
     * @param GenreService $genreService
     * @param int $tmdbId
     * 
     * @return Movie|null
     */
    public function importFromTmdb(
        TmdbClient $tmdbClient,
        ImdbService $imdbService,
        ImdbParserService $imdbParserService,
        CompanyService $companyService,
        AznudeService $aznudeService,
        GenreService $genreService,
        int $tmdbId
    ): ?Movie {
        $movieDetails = $tmdbClient->movieDetails($tmdbId);
        if (empty($movieDetails['release_date'])) throw ApiException::notFound();

        $movieTranslations = $tmdbClient->movieTranslations($tmdbId);
        if (!$movieDetails || !$movieTranslations) return null;
        $infoImdb = $imdbParserService->info($movieDetails['imdb_id']);

        $aznude = !empty($movieDetails['release_date']) && !empty($movieDetails['title']) ? $aznudeService->search(
            $movieDetails['title'],
            Carbon::parse($movieDetails['release_date'])->year
        ) : null;

        // Get the movie genres, creating the missing ones
        $genres = $genreService->getOrCreateFromTmdb($movieDetails['genres'] ?? []);

        $movie = DB::transaction(function () use ($movieDetails, $movieTranslations, $companyService, $infoImdb, $aznude, $genres) {
            // Saving the movie to the database
            $originalLangCode = strtolower($movieDetails['original_language']);

            $movie = Movie::create([
                'storage_id' => StorageId::TMDB->value,
                'tmdb_id' => $movieDetails['id'],
                'imdb_id' => $movieDetails['imdb_id'] ?? null,
                'lang_code' => $originalLangCode,
                'duration' => $movieDetails['runtime'] * 60,
                'rating_imdb' => $infoImdb->rating ?? null,
                'release_date' => !empty($movieDetails['release_date']) ? $movieDetails['release_date'] : null,
                'aznude_is_nude' => $aznude?->isNude,
                'aznude_slug' => $aznude?->slug,
            ]);

            $now = Carbon::now();

            // Overview in the original language (movie details are in English)
            $originalOverview = collect($movieTranslations['translations'])
                ->first(fn($t) => strtolower($t['iso_639_1']) === $originalLangCode && !empty($t['data']['overview']))['data']['overview']
                ?? $movieDetails['overview']
                ?? null;

            // Original-language translation (always inserted, regardless of content languages)
            $originalTranslation = [
                'movie_id' => $movie->id,
                'lang_code' => $originalLangCode,
                'title' => $movieDetails['original_title'],
                'overview' => !empty($originalOverview) ? $originalOverview : null,
                'poster_path' => !empty($movieDetails['poster_path']) ? str_replace('/', '', $movieDetails['poster_path']) : null,
                'backdrop_path' => !empty($movieDetails['backdrop_path']) ? str_replace('/', '', $movieDetails['backdrop_path']) : null,
                'created_at' => $now,
                'updated_at' => $now,
            ];

            // Translation processing
            $insertData = collect($movieTranslations['translations'])
                ->map(fn($t) => [
                    'lang_code' => strtolower($t['iso_639_1']),
                    'title' => $t['data']['title'] ?? null,
                    'overview' => !empty($t['data']['overview']) ? $t['data']['overview'] : null,
                    'poster_path' => null,
                    'backdrop_path' => null,
                ])
                ->filter(fn($t) => array_key_exists($t['lang_code'], Language::content()) && !empty($t['title']))
                ->unique('lang_code')
                ->reject(fn($t) => $t['lang_code'] === $originalLangCode)
                ->map(fn($t) => array_merge($t, [
                    'movie_id' => $movie->id,
                    'created_at' => $now,
                    'updated_at' => $now
                ]))->toArray();

            MovieTranslation::insert(array_merge([$originalTranslation], $insertData));
            $insertData = [];

            // Production processing with TMDB
            foreach ($movieDetails['production_companies'] ?? [] as $comp) {
                $insertData[] = $companyService->movieCompanyInsert(
                    movie: $movie,
                    company: $companyService->getOrCreateCompany($comp['name'], $comp['origin_country'] ?? null),
                    role: MovieCompanyRole::PRODUCTION
                );
            }

            // Processing distributors from IMDB
            foreach ($infoImdb->distributors ?? [] as $distributor) {
                $insertData[] = $companyService->movieCompanyInsert(
                    movie: $movie,
                    company: $companyService->getOrCreateCompany($distributor),
                    role: MovieCompanyRole::DISTRIBUTOR
                );
            }
            if (!empty($insertData)) MovieCompany::insert($insertData);
            $insertData = [];

            // Linking genres to the movie
            if ($genres->isNotEmpty()) $movie->genres()->attach($genres->pluck('id'));

            return $movie;
        });

        // Get the content rating from IMDB and add it to the movie
        if (isset($movieDetails['imdb_id'])) $imdbService->updateContentRatings(
            parserService: $imdbParserService,
            movie: $movie
        );

        // Asynchronous addition of localized images and videos to a movie
        AddImagesToMovie::dispatch($movie->id, $movieDetails['id'])->delay(Carbon::now()->addSeconds(mt_rand(2, 120)));
        AddVideosToMovie::dispatch($movie->id, $movieDetails['id'])->delay(Carbon::now()->addSeconds(mt_rand(2, 120)));

        // Time lock for updating data if it is missing
        foreach (
            [
                RefreshMovieDataType::IMDB_INFO,
                RefreshMovieDataType::IMDB_CONTENT_RATINGS
            ] as $type
        ) {
            Cache::put(MovieCacheKey::refreshData($movie->id, $type), true, Carbon::now()->addMinutes(20));
        }

        return $movie;
    }

    /**
     * Get all translations of the movie (content languages and the original language).
     * There are only a few of them, so they are loaded with one query and cached together.
     *
     * @param Movie $movie
     *
     * @return Collection<int, MovieTranslation>
     */
    private function getTranslations(Movie $movie): Collection
    {
        $data = Cache::remember(MovieCacheKey::translations($movie->id), Carbon::now()->addMinutes(5), function () use ($movie) {
            return $movie->translations()
                ->get()
                ->map(fn($t) => $t->getRawOriginal())
                ->toArray();
        });

        return MovieTranslation::hydrate($data);
    }

    /**
     * Get a translation for a movie.
     * 
     * @param Movie $movie
     * @param string $langCode
     * 
     * @return MovieTranslation|null
     */
    public function getTranslation(Movie $movie, ?string $langCode = null): ?MovieTranslation
    {
        $langCode ??= Language::default();

        $translations = $this->getTranslations($movie);

        // First, select your preferred language. if it is not available, select English.
        return $translations->firstWhere('lang_code', $langCode)
            ?? $translations->firstWhere('lang_code', Language::fallback());
    }

    /**
     * Get the movie translation in its original language (movies.lang_code).
     *
     * @param Movie $movie
     *
     * @return MovieTranslation|null
     */
    public function getOriginalTranslation(Movie $movie): ?MovieTranslation
    {
        return $this->getTranslations($movie)->firstWhere('lang_code', $movie->lang_code);
    }

    /**
     * Gives info about the movie if timecodes exist for the specified movie.
     * 
     * @param string $title
     * @param int|null $year
     * @param string $langCode
     * @return MoviePreviewData|null
     */
    public function searchTimecodes(string $title, ?int $year = null, ?string $langCode = null): ?MoviePreviewData
    {
        $langCode ??= Language::default();

        $movie = Cache::remember(MovieCacheKey::preview($title, $year), Carbon::now()->addMinutes(5), function () use ($title, $year) {
            $movie = Movie::findByTitlesYear(MovieHelper::getTitles($title)->all(), $year)
                ->whereHas('timecodes', function ($q) {
                    $q->whereHas('user', fn($u) => $u->whereNull('deleted_at'));
                })
                ->first();
            return $movie ? $movie->toCache() : null;
        });

        if (!$movie) return null;

        $movie = Movie::fromCache($movie);

        $translation = $this->getTranslation($movie, $langCode);

        if (!$translation) return null;

        $originalTranslation = $this->getOriginalTranslation($movie);

        return new MoviePreviewData(
            id: $movie->id,
            releaseYear: $movie->release_date?->year,
            title: $translation->title ?? $originalTranslation?->title,
            originalTitle: $originalTranslation?->title,
            posterPath: $translation->poster_path ?? $originalTranslation?->poster_path,
        );
    }

    /**
     * Returns text with a recommendation to watch the movie.
     * 
     * @param Movie $movie
     * @param Collection $productions
     * @param Collection $distributors
     * @param string $langCode
     * @return MovieCheckRecommendationData
     */
    public function checkRecommendation(
        Movie $movie,
        Collection $productions,
        Collection $distributors,
        MovieSanctionCountData $sanctionCounts,
        ?string $langCode = null
    ): MovieCheckRecommendationData {
        $langCode ??= Language::default();

        // Checking the age of a movie
        $isNew = MovieHelper::isNew($movie->release_date);

        // Productions hazard
        if ($productions->isEmpty()) return MovieCheckRecommendationData::fromLang(
            color: 'red',
            key: $isNew ? 'NoProductionYear' : 'NoProduction',
            langCode: $langCode
        );

        $prodHazardHigh = $productions->contains('hazardLevel', MovieCompanData::HAZARD_HIGH);
        if ($prodHazardHigh) return MovieCheckRecommendationData::fromLang(
            color: 'red',
            key: $isNew ? 'ProductionYear' : 'Production',
            langCode: $langCode
        );

        // Checking for bans and sanctions
        if ($sanctionCounts->bans > 0 || $sanctionCounts->strikes > 0) return MovieCheckRecommendationData::fromLang(
            color: 'red',
            key: 'Sanction',
            langCode: $langCode
        );

        // Distributors hazard
        if ($distributors->isEmpty()) return MovieCheckRecommendationData::fromLang(
            color: $isNew ? 'red' : 'yellow',
            key: $isNew ? 'NoDistributorYear' : 'NoDistributor',
            langCode: $langCode
        );

        $distHazard = $distributors->max('hazardLevel') ?? 0;
        if ($distHazard > 0) return MovieCheckRecommendationData::fromLang(
            color: $isNew ? 'red' : 'yellow',
            key: $isNew ? 'DistributorYear' : 'Distributor',
            langCode: $langCode
        );

        // Productions with moderate hazard (together with a new movie it is red)
        $prodHazardModerate = $productions->contains('hazardLevel', MovieCompanData::HAZARD_MODERATE);
        if ($prodHazardModerate) return MovieCheckRecommendationData::fromLang(
            color: $isNew ? 'red' : 'yellow',
            key: $isNew ? 'ProductionModerateYear' : 'ProductionModerate',
            langCode: $langCode
        );

        // Year
        if ($isNew) return MovieCheckRecommendationData::fromLang(
            color: 'yellow',
            key: 'Year',
            langCode: $langCode
        );

        return MovieCheckRecommendationData::fromLang(
            color: 'green',
            key: 'Safe',
            langCode: $langCode
        );
    }

    /**
     * Get the latest movies that have been checked.
     *
     * @param string $langCode
     * @param int $limit
     * @return Collection
     */
    public function latestChecked(int $limit = 20, ?string $langCode = null): Collection
    {
        $langCode ??= Language::default();

        $data = Cache::remember(MovieCacheKey::latestChecked($langCode), Carbon::now()->addMinutes(5), function () use ($langCode, $limit) {
            $events = Event::query()
                ->type(EventType::CHECK_MOVIE)
                ->with([
                    'movie.translations' => function ($q) use ($langCode) {
                        $q->whereIn('lang_code', Language::withFallback($langCode));
                    },
                    'movie.originalTranslation',
                ])
                ->orderByDesc('created_at')
                ->limit($limit + 2)
                ->get();

            return $events
                ->map(fn($event) => $event->movie)
                ->filter()
                ->unique('id')
                ->take($limit)
                ->map(function (Movie $movie) use ($langCode) {
                    $translation = $movie->translations->firstWhere('lang_code', $langCode)
                        ?? $movie->translations->firstWhere('lang_code', Language::fallback());
                    $original = $movie->originalTranslation;

                    $posterPath = $translation?->poster_path ?? $original?->poster_path;

                    return (new MovieSearchData(
                        id: $movie->id,
                        tmdbId: $movie->tmdb_id,
                        ratingImdb: $movie->rating_imdb,
                        releaseYear: $movie->release_date?->year,
                        title: $translation?->title ?? $original?->title,
                        originalTitle: $original?->title,
                        posterUrl: $posterPath ? TmdbClient::getImageUrl('w200', str_replace('/', '', $posterPath)) : null,
                        trailer: $translation?->trailer ?? $original?->trailer,
                    ))->toArray();
                })
                ->values()
                ->toArray();
        });

        return collect($data)->map(fn(array $item) => MovieSearchData::fromArray($item));
    }

    /**
     * Get a list of movies with added timecodes
     *
     * @param int $page
     * @param int $limit
     * @param string $langCode
     * @param MovieListFilterData|null $filters
     * @return array
     */
    public function latestWithTimecodes(int $page = 1, int $limit = 20, ?string $langCode = null, ?MovieListFilterData $filters = null): array
    {
        $langCode ??= Language::default();

        $filters ??= new MovieListFilterData();

        $data = Cache::remember(MovieCacheKey::latestWithTimecodes($page, $limit, $langCode, $filters->cacheKey()), Carbon::now()->addMinutes(2), function () use ($langCode, $page, $limit, $filters) {
            $query = Movie::query()
                ->whereHas('timecodes')
                ->withMax('timecodes as latest_timecode_at', 'created_at');

            $this->applyListFilters($query, $filters);

            match ($filters->sort) {
                MovieSort::ADDED => $query->orderByDesc('latest_timecode_at'),
                MovieSort::RELEASE_DESC => $query->orderByDesc('release_date')->orderByDesc('latest_timecode_at'),
                MovieSort::RELEASE_ASC => $query->orderBy('release_date')->orderByDesc('latest_timecode_at'),
            };

            $paginator = $query
                ->orderByDesc('id')
                ->with([
                    'translations' => fn($q) => $q->whereIn('lang_code', Language::withFallback($langCode)),
                    'originalTranslation',
                ])
                ->paginate($limit, ['*'], 'page', $page);

            return [
                'total' => $paginator->total(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'items' => $paginator->getCollection()->map(function (Movie $movie) use ($langCode) {
                    $translation = $movie->translations->firstWhere('lang_code', $langCode)
                        ?? $movie->translations->firstWhere('lang_code', Language::fallback());
                    $original = $movie->originalTranslation;

                    $posterPath = $translation?->poster_path ?? $original?->poster_path;

                    return (new MovieSearchData(
                        tmdbId: $movie->tmdb_id,
                        ratingImdb: $movie->rating_imdb,
                        releaseYear: $movie->release_date->year,
                        title: $translation?->title ?? $original?->title,
                        originalTitle: $original?->title,
                        posterUrl: $posterPath ? TmdbClient::getImageUrl('w200', str_replace('/', '', $posterPath)) : null,
                        trailer: $translation?->trailer ?? $original?->trailer,
                    ))->toArray();
                })->all()
            ];
        });

        return [
            'total' => $data['total'],
            'current_page' => $data['current_page'],
            'last_page' => $data['last_page'],
            'items' => collect($data['items'])->map(fn(array $item) => MovieSearchData::fromArray($item))
        ];
    }

    /**
     * Apply the list filters to the movie query.
     */
    private function applyListFilters(Builder $query, MovieListFilterData $filters): void
    {
        // The movie must have all the genres
        foreach ($filters->genres as $genre) {
            $query->whereHas('genres', fn($q) => $q->where('slug', $genre));
        }

        if ($filters->yearFrom !== null) $query->where('release_date', '>=', Carbon::create($filters->yearFrom)->startOfYear());
        if ($filters->yearTo !== null) $query->where('release_date', '<=', Carbon::create($filters->yearTo)->endOfYear());
        if ($filters->rating !== null) $query->where('rating_imdb', '>=', $filters->rating);

        // The movie must have one of the recommendations
        if (!empty($filters->recommendations)) {
            $query->where(function (Builder $q) use ($filters) {
                foreach ($filters->recommendations as $recommendation) {
                    $q->orWhere(fn(Builder $q) => $this->whereRecommendation($q, $recommendation));
                }
            });
        }
    }

    /**
     * SQL version of checkRecommendation(), the conditions must match it.
     */
    private function whereRecommendation(Builder $query, MovieRecommendation $recommendation): void
    {
        $newSince = MovieHelper::newSince();

        $production = fn(Builder $q) => $q->where('role_id', MovieCompanyRole::PRODUCTION->value);
        $highHazardProduction = fn(Builder $q) => $this->whereHazardCompany($production($q), MovieCompanData::HAZARD_HIGH);
        $moderateHazardProduction = fn(Builder $q) => $this->whereHazardCompany($production($q), MovieCompanData::HAZARD_MODERATE);
        $distributor = fn(Builder $q) => $q->where('role_id', MovieCompanyRole::DISTRIBUTOR->value);
        $hazardDistributor = fn(Builder $q) => $this->whereHazardCompany($distributor($q));
        $sanction = fn(Builder $q) => $this->whereBlockingSanction($q);

        // Productions are known and without high hazard, no bans/strikes
        $baseSafe = fn(Builder $q) => $q
            ->whereHas('companies', $production)
            ->whereDoesntHave('companies', $highHazardProduction)
            ->whereDoesntHave('sanctions', $sanction);

        $distributorSafe = fn(Builder $q) => $q
            ->whereHas('companies', $distributor)
            ->whereDoesntHave('companies', $hazardDistributor);

        $distributorUnsafe = fn(Builder $q) => $q->where(fn(Builder $q) => $q
            ->whereDoesntHave('companies', $distributor)
            ->orWhereHas('companies', $hazardDistributor));

        match ($recommendation) {
            MovieRecommendation::GREEN => $baseSafe($query)
                ->where('release_date', '<=', $newSince)
                ->whereDoesntHave('companies', $moderateHazardProduction)
                ->where(fn(Builder $q) => $distributorSafe($q)),

            // Old with unsafe distributors, or safe distributors and (new or old with moderate hazard production)
            MovieRecommendation::YELLOW => $baseSafe($query)->where(fn(Builder $q) => $q
                ->where(fn(Builder $q) => $distributorUnsafe($q->where('release_date', '<=', $newSince)))
                ->orWhere(fn(Builder $q) => $distributorSafe($q)->where(fn(Builder $q) => $q
                    ->where(fn(Builder $q) => $q
                        ->where('release_date', '>', $newSince)
                        ->whereDoesntHave('companies', $moderateHazardProduction))
                    ->orWhere(fn(Builder $q) => $q
                        ->where('release_date', '<=', $newSince)
                        ->whereHas('companies', $moderateHazardProduction))))),

            MovieRecommendation::RED => $query->where(fn(Builder $q) => $q
                ->whereDoesntHave('companies', $production)
                ->orWhereHas('companies', $highHazardProduction)
                ->orWhereHas('sanctions', $sanction)
                ->orWhere(fn(Builder $q) => $distributorUnsafe($q->where('release_date', '>', $newSince)))
                ->orWhere(fn(Builder $q) => $q
                    ->where('release_date', '>', $newSince)
                    ->whereHas('companies', $moderateHazardProduction))),
        };
    }

    /**
     * Movie companies with the hazard level (any hazard if null),
     * the same as MovieCompanData::getHazardLevel().
     */
    private function whereHazardCompany(Builder $query, ?int $level = null): Builder
    {
        $matchAny = fn(Builder $q, array $keywords) => $q->where(function (Builder $q) use ($keywords) {
            foreach ($keywords as $keyword) {
                $q->orWhereRaw('LOWER(name) LIKE ?', ['%' . $keyword . '%']);
            }
        });

        return $query->whereHas('company', function (Builder $q) use ($level, $matchAny) {
            if ($level === null) {
                $matchAny($q, MovieCompanData::hazardKeywords());
                return;
            }

            // Keywords of the level, but not of the levels checked before it
            $before = [];
            $keywordsByLevel = MovieCompanData::hazardKeywordsByLevel();
            foreach ($keywordsByLevel as $itemLevel => $keywords) {
                if ($itemLevel === $level) break;
                $before = array_merge($before, $keywords);
            }

            $matchAny($q, $keywordsByLevel[$level] ?? []);
            if (!empty($before)) $q->whereNot(fn(Builder $q) => $matchAny($q, $before));
        });
    }

    /**
     * Approved bans and strikes (the same as MovieSanctionService::getCounts()).
     */
    private function whereBlockingSanction(Builder $query): Builder
    {
        return $query
            ->whereNotNull('approved_at')
            ->whereIn('type', [SanctionType::BANNED->value, SanctionType::STRIKE->value]);
    }
}
