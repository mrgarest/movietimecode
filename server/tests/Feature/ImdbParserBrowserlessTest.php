<?php

use App\Clients\ImdbClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Cache\ImdbCacheKey;

it('parsing from IMDb using Browserless', function () {
    /** @var ImdbClient $client */
    $client = app(ImdbClient::class);

    //Updating cookies via Browserless
    $cookiesRefreshed = $client->refreshCookies();
    expect($cookiesRefreshed)->toBeTrue('Unable to retrieve cookies');

    // Get cookies from the cache
    $cookie = Cache::get(ImdbCacheKey::cookies());
    expect($cookie)->not->toBeNull('The cookies were successfully retrieved but were not stored in the cache.');

    // Direct request
    $response = Http::withHeaders([
        'User-Agent' => ImdbClient::USER_AGENT,
        'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language' => 'en-US,en;q=0.5',
        'Cookie' => $cookie
    ])->withOptions([
        'curl' => [
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2_0,
            CURLOPT_SSLVERSION => CURL_SSLVERSION_TLSv1_3,
        ]
    ])
        ->timeout(20)
        ->get(ImdbClient::API_BASE . '/title/tt0816692/reference');

    expect($response->status())->toBe(
        200,
        "IMDb Request Failed!\n" .
            "Status Code: {$response->status()}\n" .
            "HTML Preview: " . substr($response->body(), 0, 3000)
    );
});
