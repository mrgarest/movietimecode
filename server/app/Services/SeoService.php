<?php

namespace App\Services;

use RalphJSmit\Laravel\SEO\Support\SEOData;

class SeoService
{
    public function getSeoData(string $path): SEOData
    {
        return match ($path) {
            '/' => new SEOData(title: 'Головна сторінка'),
            'movies/timecodes' => new SEOData(title: 'Таймкоди фільмів'),
            'privacy' => new SEOData(title: 'Політика конфіденційності'),
            default => new SEOData(title: 'Мій Додаток'),
        };
    }

}
