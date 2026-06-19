<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Browserless
    |--------------------------------------------------------------------------
    |
    | This setting is for bypassing bot blocks via browserless, which must be installed on the same server.
    |
    */

    'enabled' => (bool) env('BROWSERLESS_ENABLED', false),

    'url' => env('BROWSERLESS_URL'),

    'token' => env('BROWSERLESS_TOKEN')
];
