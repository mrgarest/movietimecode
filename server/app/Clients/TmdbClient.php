<?php

namespace App\Clients;

use Illuminate\Support\Facades\Http;

class TmdbClient
{
    const API_BASE = "https://api.themoviedb.org/3";
    private ?string $token = null;

    public function __construct()
    {
        $this->token = config('services.tmdb.token');
    }

    public function withHeaders()
    {
        return Http::withHeaders([
            'Accept' => 'application/json',
        ])->withToken($this->token);
    }

    public function get(string $url, $query = null)
    {
        /** @var Response $response */
        $response = $this->withHeaders()->get($url, $query);
        return $response->successful() ? $response->json() : null;
    }

    public function searchMovie($query, $language = 'en-US', $page = 1, int|null $year = null)
    {
        $queryParams = [
            'query' => $query,
            'include_adult' => 'false',
            'language' => $language,
            'page' => $page,
        ];
        if ($year != null) $queryParams['year'] = $year;
        return $this->get(self::API_BASE . '/search/movie', $queryParams);
    }

    public function movieDetails($id, $language = 'en-US')
    {
        return $this->get(self::API_BASE . "/movie/$id?language=$language");
    }

    public function movieTranslations($id)
    {
        return $this->get(self::API_BASE . "/movie/$id/translations");
    }

    public function movieImages($id)
    {
        return $this->get(self::API_BASE . "/movie/$id/images");
    }

    public function movieVideos($id, string $language = 'en-US')
    {
        return $this->get(self::API_BASE . "/movie/$id/videos", ['language' => $language]);
    }

    public function movieExternalIds($id)
    {
        return $this->get(self::API_BASE . "/movie/$id/external_ids");
    }

    public static function getImageUrl(string $size, $path)
    {
        return $path ? "https://image.tmdb.org/t/p/$size/$path" : null;
    }
}
