<?php

namespace App\Http\Controllers;

use App\Enums\MovieCompanyRole;
use App\Helpers\RequestManager;
use App\Http\Resources\Movie\MovieCardResource;
use App\Http\Resources\Movie\MovieDetailResource;
use App\Services\CompanyService;
use App\Services\IMDB\ImdbService;
use App\Services\MovieSanctionService;
use App\Services\MovieService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MovieController extends Controller
{
    public function detail(
        Request $request,
        int $movieId,
        MovieService $movieService,
        MovieSanctionService $sanctionService,
        CompanyService $companyService,
        ImdbService $imdbService
    ) {
        $movie = $movieService->getOrImport(
            tmdbId: $movieId,
            ip: RequestManager::getIp($request),
            import: false
        );

        if (!$movie) throw new NotFoundHttpException();

        $translation = $movieService->getTranslation($movie);
        $sanctionCounts = $sanctionService->getCounts($movie->id);
        $companies = $companyService->getForMovie($movie);
        $productions = $companies->where('role', MovieCompanyRole::PRODUCTION)->values();
        $distributors = $companies->where('role', MovieCompanyRole::DISTRIBUTOR)->values();
        $contentRatings = $imdbService->getContentRatings($movie);
        $recommendation = $movieService->checkRecommendation(
            movie: $movie,
            productions: $productions,
            distributors: $distributors,
            sanctionCounts: $sanctionCounts
        );

        return Inertia::render('movies/detail', [
            'movie' => new MovieDetailResource([
                'tmdb_id' => (int) $movieId,
                'movie' => $movie,
                'translation' => $translation,
                'productions' => $productions,
                'distributors' => $distributors,
                'sanctionCounts' => $sanctionCounts,
                'imdb' => [
                    'id' => $movie->imdb_id,
                    'content_ratings' => $contentRatings
                ],
                'recommendation' => $recommendation
            ])->resolve()
        ]);
    }

    public function withTimecodes(MovieService $movieService)
    {
        $data = $movieService->latestWithTimecodes(page: 1);

        return Inertia::render('movies/with-timecodes', [
            'movies' => [
                'current_page' => $data['current_page'],
                'last_page' => $data['last_page'],
                'items' => MovieCardResource::collection($data['items'])->resolve(),
            ]
        ]);
    }
}
