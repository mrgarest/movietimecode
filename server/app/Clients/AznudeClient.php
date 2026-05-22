<?php

namespace App\Clients;

use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Http;

class AznudeClient
{
    const API_BASE = "https://main-aq7es5tiuq-uc.a.run.app";
    private ?array $searchToken = null;

    public function withHeaders($headers = [])
    {
        return Http::withHeaders(array_merge([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept' => 'application/json',
            'Accept-Language' => 'en-US,en;q=0.5',
        ], $headers));
    }

    public function getSearchTokenHeaders(): ?array
    {
        $expiration = isset($this->searchToken['exp']) ? Carbon::createFromTimestampMs($this->searchToken['exp'])->subMinute() : null;

        if (!$expiration || Carbon::now()->greaterThanOrEqualTo($expiration)) {
            $response = $this->withHeaders()->timeout(10)->get(self::API_BASE . '/app/search-token');
            if (!$response->successful()) {
                $this->searchToken = null;
                return null;
            }
            $this->searchToken = $response->json();
        }

        return [
            'X-Sid' => $this->searchToken['sid'],
            'X-St' => $this->searchToken['token']
        ];
    }

    public function search(string $query)
    {
        try {
            $searchToken = $this->getSearchTokenHeaders();
            if (!$searchToken) return;

            $response = $this->withHeaders($searchToken)->timeout(10)->get(self::API_BASE . '/app/exp/initial-search', [
                'q' => $query,
                'gender' => 'f',
                'type' => 'movies',
                'limit' => 5
            ]);

            return $response->successful() ? $response->json() : null;
        } catch (Exception $ex) {
            return null;
        }
    }
}
