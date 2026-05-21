<?php

namespace App\Services;

use App\Cache\MovieCacheKey;
use App\Enums\MovieCompanyRole;
use App\Enums\RefreshMovieDataType;
use App\Jobs\RefreshMovieDataJob;
use App\Models\Movie;
use App\Models\MovieCompany;
use App\Services\IMDB\ImdbService;
use App\Services\IMDB\ImdbParserService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class RefreshMovieDataService
{
    public function __construct(
        protected ImdbParserService $imdbParserService,
        protected ImdbService $imdbService,
        protected AznudeService $aznudeService,
    ) {}

    /**
     * Method for starting a data refresh job.
     * @param int $movieId
     * @param RefreshMovieDataType[] $types
     */
    public static function dispatch(int $movieId, array $types = []): void
    {
        foreach ($types as $type) {
            $key = MovieCacheKey::refreshData($movieId, $type);
            if (Cache::has($key)) continue;
            $time = Carbon::now()->addSeconds(mt_rand(5, 240));

            RefreshMovieDataJob::dispatch($movieId, $type)->delay($time);
            Cache::put($key, true, $time->addMinutes(10));
        }
    }

    /**
     * The main input method for updating a specific type of movie data.
     * @param int $movieId
     * @param RefreshMovieDataType $type
     */
    public function refresh(int $movieId, RefreshMovieDataType $type): void
    {
        match ($type) {
            RefreshMovieDataType::IMDB_INFO => $this->handleImdbInfo($movieId),
            RefreshMovieDataType::IMDB_CONTENT_RATINGS => $this->handleImdbContentRatings($movieId),
            RefreshMovieDataType::AZNUDE => $this->handleAznude($movieId),
            default => throw new \Exception("Unsupported type")
        };
    }

    /**
     * Processing IMDb basic data.
     * @param int $movieId
     */
    private function handleImdbInfo(int $movieId): void
    {
        $movie = Movie::with([
            'companies' => fn($q) => $q->where('role_id', MovieCompanyRole::DISTRIBUTOR->value),
        ])->find($movieId);

        if (!$movie || !$movie->imdb_id) return;

        $infoImdb = $this->imdbParserService->info($movie->imdb_id);

        // Rating update
        if ($infoImdb->rating) $movie->update(['rating_imdb' => $infoImdb->rating]);

        if (empty($infoImdb->distributors)) return;

        // Get company IDs
        $existingCompanyIds = $movie->companies->pluck('company_id')->toArray();

        $companyService = app(CompanyService::class);

        $insertData = [];
        foreach ($infoImdb->distributors as $distributorName) {
            $company = $companyService->getOrCreateCompany($distributorName);

            // Checking the existence of companies
            if (!in_array($company->id, $existingCompanyIds)) {
                $insertData[] = $companyService->movieCompanyInsert(
                    movie: $movie,
                    company: $company,
                    role: MovieCompanyRole::DISTRIBUTOR
                );

                // Add to the existing array to avoid duplicates
                $existingCompanyIds[] = $company->id;
            }
        }

        if (!empty($insertData)) MovieCompany::insert($insertData);
    }

    /**
     * Processes content ratings from IMDB.
     * @param int $movieId
     */
    private function handleImdbContentRatings(int $movieId): void
    {
        $movie = Movie::find($movieId);

        if (!$movie) return;

        $this->imdbService->updateContentRatings(
            parserService: $this->imdbParserService,
            movie: $movie
        );
    }

    /**
     * Update from aznude.
     * @param int $movieId
     */
    private function handleAznude(int $movieId): void
    {
        $movie = Movie::select('id', 'original_title', 'release_date', 'aznude_is_nude', 'aznude_slug')->find($movieId);

        if (!$movie || !$movie->release_date->year) return;

        $aznude = $this->aznudeService->search($movie->original_title, $movie->release_date->year);

        if (!$aznude) return;

        $movie->update([
            'aznude_is_nude' => $aznude->isNude,
            'aznude_slug' => $aznude->slug,
        ]);
    }
}
