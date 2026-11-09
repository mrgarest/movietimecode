<?php

return [

    /*
    | Languages of the movie content (titles, overviews, posters, trailers, genres).
    | Codes are ISO 639-1, as in the lang_code columns.
    */
    'languages' => [
        // Languages in which the content is stored: language code => TMDB locale
        'content' => [
            'uk' => 'uk-UA',
            'en' => 'en-US',
        ],

        // Language of the content by default (also used for the TMDB search)
        'default' => 'uk',

        // Used when there is no translation in the requested language.
        // TMDB movie details (genres) are requested in this language.
        'fallback' => 'en',
    ],

    /*
    | A movie is "new" if it was released within this count of years.
    | New movies have a higher risk of being blocked (recommendation and release date hazard).
    */
    'new_movie_years' => 4,

    /*
    | Hazardous companies: hazard level => keywords in the company name (lowercase).
    | The order matters: the first matched level is used.
    |
    | Levels:
    |   3 - moderate (yellow)
    |   2 - high (red)
    */
    'hazard_companies' => [
        3 => ['marvel'],
        2 => ['warner', 'disney', 'lucasfilm', 'netflix', 'apple', 'hbo', 'amazon', 'crunchyroll'],
    ],

    /*
    | Filters of the movie list with timecodes.
    */
    'list_filters' => [
        'min_year' => 1870,
        'max_year' => 2100,
        'max_genres' => 10,
    ],

];
