<?php

namespace App\Services\IMDB;

use App\Clients\ImdbClient;
use App\DTO\IMDB\ImdbInfoData;
use Illuminate\Support\Str;

class ImdbParserService
{
    public function __construct(
        protected ImdbClient $client
    ) {}

    /**
     * Get information about the movie from IMDB.
     *
     * @param string $id
     * 
     * @return ImdbInfoData|null
     */
    public function info(string $id): ImdbInfoData
    {
        $data = $this->client->info($id);
        if (!$data) return new ImdbInfoData();

        return new ImdbInfoData(
            rating: $this->getRating($data),
            distributors: $this->getDistributors($data)
        );
    }

    /**
     * Get a movie rating.
     *
     * @param string $data Response data from the client
     * 
     * @return float|null
     */
    private function getRating(string $data): ?float
    {
        preg_match('@ipc-rating-star--rating">([0-9.]+)</span>@m', $data, $matches);

        if (!isset($matches[1])) return null;
        $value = str_replace(',', '.', $matches[1]);

        return is_numeric($value) ? (float) $value : null;
    }

    // private static function getMPA($data)
    // {
    //     return null;
    //     preg_match('~<li class="ipl-inline-list__item">(?:\s+)(TV-Y|TV-Y7|TV-Y7-FV|TV-G|TV-PG|TV-14|TV-MA|TV-MA-L|TV-MA-S|TV-MA-V|G|PG|PG-13|R|NC-17|NR|UR|M|X)(?:\s+)<\/li>~Uim', $data, $matches);

    //     return isset($matches[1]) ? $matches[1] : null;
    // }

    /**
     * Get distributors.
     *
     * @param string $data Response data from the client
     * 
     * @return array|null
     */
    private function getDistributors(string $data): ?array
    {
        // Pull out the distribution category
        $categories = data_get($this->getNextData($data), 'props.pageProps.mainColumnData.companyCreditCategories') ?? [];
        $credits = collect($categories)->firstWhere('category.id', 'distribution')['companyCredits']['edges'] ?? [];

        if (empty($credits)) {
            return null;
        }

        // Replacement dictionary (Search key => Reference name)
        $mapping = [
            'twentieth century fox' => '20th Century Fox',
            '20th century fox' => '20th Century Fox',
            'universal pictures' => 'Universal Pictures',
            'universal studios' => 'Universal Pictures',
            'warner' => 'Warner Bros.',
            'paramount' => 'Paramount',
            'disney' => 'Disney',
            'sony pictures' => 'Sony Pictures',
            'columbia tristar' => 'Columbia TriStar Films',
        ];

        $allowedRegions = [
            'World-wide',
            'Ukraine',
            'United States',
            'Canada',
            'United Kingdom',
            'Germany',
            'Ireland',
            'Spain',
            'France',
            'Finland',
            'Italy',
            'Hong Kong',
            'Brazil',
            'South Korea',
            'Australia',
            'Netherlands',
            'Japan',
            'Portugal',
            'Poland',
            'United Arab Emirates'
        ];

        return collect($credits)
            ->map(function ($credit) use ($allowedRegions, $mapping) {
                $node = $credit['node'] ?? [];
                $countries = collect($node['countries'] ?? [])->pluck('text')->all();
                $attributes = collect($node['attributes'] ?? [])->pluck('text')->implode(', ');

                // Filter by rental type and region
                if (!Str::contains($attributes, 'theatrical') || !array_intersect($countries, $allowedRegions)) {
                    return null;
                }

                // Clean up the name: decode entities
                $cleanName = data_get($node, 'displayableProperty.value.plainText') ?? '';
                $cleanName = html_entity_decode($cleanName, ENT_QUOTES | ENT_HTML5, 'UTF-8');

                // Remove non-breaking spaces (\xA0) and regular extra spaces
                $cleanName = preg_replace('/\s+/u', ' ', $cleanName);
                $cleanName = trim($cleanName);

                $lowerName = mb_strtolower($cleanName);

                // Searching for a match in the dictionary
                foreach ($mapping as $search => $replacement) {
                    if (str_contains($lowerName, $search)) {
                        return $replacement;
                    }
                }

                return $cleanName;
            })
            ->filter()
            ->unique()
            ->values()
            ->toArray();
    }

    public function contentInfo(string $id): ?array
    {
        $data = $this->client->contentInfo($id);
        if (!$data) return null;

        // Mapping IMDb category IDs to keys in our array
        $ratingMap = [
            'NUDITY' => 'nudity',
            'VIOLENCE' => 'violence',
            'PROFANITY' => 'profanity',
            'ALCOHOL' => 'alcohol',
            'FRIGHTENING' => 'frightening',
        ];

        $contentRating = array_fill_keys(array_values($ratingMap), null);
        $guides = [];

        // Parsing rating levels (Mild, Moderate, etc.) and detailed descriptions (guides)
        foreach ($this->getParentsGuideCategories($data) as $category) {
            $key = $ratingMap[$category['id'] ?? ''] ?? null;
            if (!$key) continue;

            $contentRating[$key] = $this->convertContentRating($category['severitySummary']['text'] ?? '');

            $guides[$key] = collect($category['items'] ?? [])
                ->map(fn($item) => trim(html_entity_decode($item['text'] ?? '')))
                ->filter(fn($text) => $text !== '' && $text !== '(none)')
                ->values()
                ->toArray();
        }

        return [
            'rating' => $contentRating,
            'gides' => array_filter($guides)
        ];
    }

    /**
     * Get parents guide categories from the page's __NEXT_DATA__ JSON.
     *
     * @param string $data Response data from the client
     *
     * @return array
     */
    private function getParentsGuideCategories(string $data): array
    {
        return data_get($this->getNextData($data), 'props.pageProps.contentData.categories') ?? [];
    }

    /**
     * Get the __NEXT_DATA__ JSON embedded in the page.
     *
     * A lazy ".+?" is not used here: on large pages it exceeds pcre.backtrack_limit and preg_match fails.
     *
     * @param string $data Response data from the client
     *
     * @return array
     */
    private function getNextData(string $data): array
    {
        if (!preg_match('@<script id="__NEXT_DATA__"[^>]*>([^<]+)</script>@', $data, $matches)) {
            return [];
        }

        return json_decode($matches[1], true) ?? [];
    }

    private function convertContentRating(string $severity): ?int
    {
        $levels = [
            'None' => 0,
            'Mild' => 1,
            'Moderate' => 2,
            'Severe' => 3,
        ];

        return $levels[$severity] ?? null;
    }
}
