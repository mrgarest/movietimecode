<?php

namespace App\Clients;

use App\Cache\ImdbCacheKey;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ImdbClient
{
    const API_BASE = "https://www.imdb.com";
    protected string $userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    /**
     * Refresh cookies from IMDb via browserless to bypass parsing protection.
     */
    public function refreshCookies(): bool
    {
        $browserless = config('browserless');

        $script = "export default async function ({ page }) {
                await page.setUserAgent('{$this->userAgent}');
                await page.setRequestInterception(true);
                page.on('request', (req) => {
                    if (['image', 'font', 'media'].includes(req.resourceType())) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
                try {
                    await page.goto('" . self::API_BASE . "', { waitUntil: 'networkidle2', timeout: 30000 });
                    await new Promise(r => setTimeout(r, 3000));
                    const cookies = await page.cookies();
                    return { data: JSON.stringify(cookies), type: 'application/json' };
                } catch (e) {
                    return { data: 'Error: ' + e.message, type: 'text/plain' };
                }
            }";

        /** @var Response $response */
        $response = Http::withBody($script, 'application/javascript')
            ->post("{$browserless['url']}/function?token={$browserless['token']}");

        if ($response->successful()) {
            $responseData = $response->json();

            // Json decode
            $cookiesArray = json_decode($responseData['data'] ?? '[]', true);

            // Cookie collection
            $cookieString = collect($cookiesArray)
                ->map(fn($c) => "{$c['name']}={$c['value']}")
                ->implode('; ');

            // Data storage
            if (!empty($cookieString)) {
                Cache::put(ImdbCacheKey::cookies(), $cookieString, Carbon::now()->addMinutes(5));
            }
            return true;
        }

        return false;
    }

    /**
     * Sends a GET request to parse data from IMDb.
     */
    public function get(string $url)
    {
        $cookie = Cache::get(ImdbCacheKey::cookies());

        $header = [
            'User-Agent' => $this->userAgent,
            'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language' => 'en-US,en;q=0.5',
        ];

        if ($cookie) $header['Cookie'] = $cookie;

        /** @var Response $response */
        $response = Http::withHeaders($header)->timeout(10)->get(self::API_BASE . $url);

        return $response->successful() ? $response->body() : null;
    }

    public function info($id)
    {
        return $this->get("/title/$id/reference");
    }

    public function contentInfo($id)
    {
        return $this->get("/title/$id/parentalguide/?ref_=tt_ov_pg#contentRating");
    }
}
