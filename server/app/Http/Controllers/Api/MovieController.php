<?php

namespace App\Http\Controllers\Api;

use App\Enums\MovieCompanyRole;
use App\Enums\RefreshMovieDataType;
use App\Exceptions\ApiException;
use App\Helpers\RequestManager;
use App\Http\Controllers\Controller;
use App\Http\Resources\Movie\MovieCardResource;
use App\Http\Resources\Movie\MovieCheckResource;
use App\Http\Resources\Movie\MovieDetailResource;
use App\Http\Resources\Movie\MoviePreviewResource;
use App\Http\Resources\Movie\MovieSearchResource;
use App\Http\Resources\SuccessResource;
use App\Services\CompanyService;
use App\Services\IMDB\ImdbService;
use App\Services\MovieSanctionService;
use App\Services\MovieService;
use App\Services\RefreshMovieDataService;
use Illuminate\Http\Request;

class MovieController extends Controller
{
    public function __construct(
        protected MovieService $movieService
    ) {}

    /**
     * Search for movies by title.
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'q' => 'required|string',
            'page' => 'nullable|integer',
            'year' => 'nullable|integer',
            'with' => 'nullable|string',
        ]);

        $with = $request->filled('with') ? explode(',', $validated['with']) : [];
        MovieSearchResource::setWith($with);

        return new SuccessResource([
            'items' => MovieSearchResource::collection($this->movieService->searchTmdb(
                title: trim(urldecode($validated['q'])),
                page: $validated['page'] ?? 1,
                year: $validated['year'] ?? null,
                with: $with
            ))
        ]);
    }

    /**
     * Gives info about the movie if timecodes exist for the specified movie.
     */
    public function searchTimecodes(Request $request)
    {
        $validated = $request->validate([
            'q' => 'required|string',
            'year' => 'nullable|integer'
        ]);

        $data = $this->movieService->searchTimecodes(
            title: trim(urldecode($validated['q'])),
            year: $validated['year'] ?? null
        );

        if (!$data) throw ApiException::notFound();

        return new MoviePreviewResource($data);
    }

    /**
     * Movie check.
     */
    public function check(
        Request $request,
        int $movieId,
        MovieService $movieService,
        MovieSanctionService $sanctionService,
        CompanyService $companyService,
        ImdbService $imdbService
    ) {
        // Get the movie model
        $movie = $movieService->getOrImport(
            tmdbId: $movieId,
            ip: RequestManager::getIp($request)
        );

        if (!$movie) throw ApiException::notFound();

        // Get the count of bans/strikes
        $sanctionCounts = $sanctionService->getCounts($movie->id);

        // Get companies for the movie
        $companies = $companyService->getForMovie($movie);
        $productions = $companies->where('role', MovieCompanyRole::PRODUCTION)->values();
        $distributors = $companies->where('role', MovieCompanyRole::DISTRIBUTOR)->values();

        // Get content ratings
        $contentRatings = $imdbService->getContentRatings($movie);

        // Recommendation for the movie
        $recommendation = $movieService->checkRecommendation(
            movie: $movie,
            productions: $productions,
            distributors: $distributors,
            sanctionCounts: $sanctionCounts
        );

        // Starts updating data if it is missing
        $refreshMovieDataTypes = [];
        if ($contentRatings->isEmpty()) $refreshMovieDataTypes[] = RefreshMovieDataType::IMDB_CONTENT_RATINGS;
        if ($distributors->isEmpty() || !$movie->rating_imdb) $refreshMovieDataTypes[] = RefreshMovieDataType::IMDB_INFO;
        if (!empty($refreshMovieDataTypes)) RefreshMovieDataService::dispatch($movie->id, $refreshMovieDataTypes);

        return new MovieCheckResource([
            'tmdb_id' => (int) $movieId,
            'movie' => $movie,
            'productions' => $productions,
            'distributors' => $distributors,
            'sanctionCounts' => $sanctionCounts,
            'imdb' => [
                'id' => $imdbService->getImdbId($movie),
                'content_ratings' => $contentRatings
            ],
            'recommendation' => $recommendation
        ]);
    }

    /**
     * Movie Details.
     */
    public function details(
        Request $request,
        int $movieId,
        MovieService $movieService,
        MovieSanctionService $sanctionService,
        CompanyService $companyService,
        ImdbService $imdbService
    ) {
        // Get the movie model
        $movie = $movieService->getOrImport(
            tmdbId: $movieId,
            ip: RequestManager::getIp($request)
        );

        if (!$movie) throw ApiException::notFound();

        $translation = $movieService->getTranslation($movie);

        // Get the count of bans/strikes
        $sanctionCounts = $sanctionService->getCounts($movie->id);

        // Get companies for the movie
        $companies = $companyService->getForMovie($movie);
        $productions = $companies->where('role', MovieCompanyRole::PRODUCTION)->values();
        $distributors = $companies->where('role', MovieCompanyRole::DISTRIBUTOR)->values();

        // Get content ratings
        $contentRatings = $imdbService->getContentRatings($movie);

        // Recommendation for the movie
        $recommendation = $movieService->checkRecommendation(
            movie: $movie,
            productions: $productions,
            distributors: $distributors,
            sanctionCounts: $sanctionCounts
        );

        // Starts updating data if it is missing
        $refreshMovieDataTypes = [];
        if ($contentRatings->isEmpty()) $refreshMovieDataTypes[] = RefreshMovieDataType::IMDB_CONTENT_RATINGS;
        if ($distributors->isEmpty() || !$movie->rating_imdb) $refreshMovieDataTypes[] = RefreshMovieDataType::IMDB_INFO;
        if (!empty($refreshMovieDataTypes)) RefreshMovieDataService::dispatch($movie->id, $refreshMovieDataTypes);

        return new MovieDetailResource([
            'tmdb_id' => (int) $movieId,
            'movie' => $movie,
            'translation' => $translation,
            'productions' => $productions,
            'distributors' => $distributors,
            'sanctionCounts' => $sanctionCounts,
            'imdb' => [
                'id' => $imdbService->getImdbId($movie),
                'content_ratings' => $contentRatings
            ],
            'recommendation' => $recommendation
        ]);
    }

    /**
     * Movie latest.
     */
    public function latest(MovieService $movieService)
    {
        $limit = 15;

        return new SuccessResource([
            'checked' => MovieCardResource::collection($movieService->latestChecked(limit: $limit)),
            'timecodes' => MovieCardResource::collection($movieService->latestWithTimecodes(limit: $limit)['items'])
        ]);
    }

    /**
     * List of movies with timecodes.
     */
    public function withTimecodes(Request $request, MovieService $movieService)
    {
        $validated = $request->validate([
            'page' => 'nullable|integer'
        ]);

        $data = $movieService->latestWithTimecodes(page: $validated['page'] ?? 1);

        return new SuccessResource([
            'current_page' => $data['current_page'],
            'last_page' => $data['last_page'],
            'items' => MovieCardResource::collection($data['items']),
        ]);
    }
}
