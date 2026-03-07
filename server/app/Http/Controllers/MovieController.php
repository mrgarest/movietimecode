<?php

namespace App\Http\Controllers;

use App\Http\Resources\Movie\MovieCardResource;
use App\Services\MovieService;
use App\Services\SeoService;
use Illuminate\Support\Facades\Lang;
use RalphJSmit\Laravel\SEO\SchemaCollection;
use RalphJSmit\Laravel\SEO\Support\SEOData;

class MovieController extends Controller
{
    public function __construct(
        protected MovieService $movieService
    ) {}

    /**
     * Page with a list of movies that have timecodes.
     */
    public function withTimecodes()
    {
        $data = $this->movieService->latestWithTimecodes(page: 1);

        $title = Lang::get('seoTitleMoviesWithTimecodes', [], SeoService::langCode);
        return view('app', [
            'seoData' => new SEOData(
                title: $title,
                description: Lang::get('seoDescriptionMoviesWithTimecodes', [], SeoService::langCode),
                image: asset(SeoService::image),
                schema: SchemaCollection::make()->add(fn() => [
                    '@context' => 'https://schema.org',
                    '@type' => 'ItemList',
                    'name' => $title,
                    'itemListElement' => collect($data['items'])->map(fn($movie, $index) => [
                        '@type' => 'ListItem',
                        'position' => $index + 1,
                        'item' => [
                            '@type' => 'Movie',
                            'name' => $movie->title,
                            'url' => "https://movietimecode.mrgarest.com/movies/{$movie->tmdbId}",
                            'image' => $movie->posterUrl,
                        ]
                    ])->values()->toArray()
                ])
            ),
            'appData' => [
                'lastPage' => $data['last_page'],
                'items' => MovieCardResource::collection($data['items']),
            ]
        ]);
    }
}
