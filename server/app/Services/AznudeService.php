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

        $movie = $collection->first(function ($movie) use ($query, $year) {
            if ($year) {
                $dates = array_map('trim', explode('-', (string) $movie['date']));

                $from = (int) $dates[0];
                $to = isset($dates[1]) ? (int) $dates[1] : $from;

                if ($year < $from || $year > $to) {
                    return false;
                }
            }

            return Str::lower($movie['text']) === Str::lower($query);
        });

        return $movie ? AznudeSearchData::fromAznude($movie) : null;
    }
}
