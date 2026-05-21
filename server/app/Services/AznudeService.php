<?php

namespace App\Services;

use App\Clients\AznudeClient;
use App\DTO\Aznude\AznudeSearchData;
use Illuminate\Support\Str;

class AznudeService
{
    public function __construct(
        protected AznudeClient $client
    ) {}

    public function search(string $query, int $year): ?AznudeSearchData
    {
        $data = $this->client->search($query);
        $movies = $data['data']['movies'] ?? null;
        if (!$movies) return null;

        $collection = collect($movies);

        // Exact match search
        $movie = $collection->first(function ($movie) use ($query, $year) {
            if ($year && $movie['date'] != $year) {
                return false;
            }
            return Str::lower($movie['text']) === Str::lower($query);
        });

        // if ($movie) return AznudeSearchData::fromAznude($movie);

        // // Search by approximate match
        // $movie = $collection->first(function ($movie) use ($query, $year) {
        //     if ($year && $movie['date'] != $year) {
        //         return false;
        //     }
        //     return Str::contains(Str::lower($movie['text']), Str::lower($query));
        // });

        return $movie ? AznudeSearchData::fromAznude($movie) : null;
    }
}
