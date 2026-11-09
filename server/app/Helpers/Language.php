<?php

namespace App\Helpers;

/**
 * Languages of the movie content from config movie.languages.
 */
class Language
{
    /**
     * Languages in which the content is stored: language code => TMDB locale.
     *
     * @return array<string, string>
     */
    public static function content(): array
    {
        return config('movie.languages.content');
    }

    /**
     * Language of the content by default.
     */
    public static function default(): string
    {
        return config('movie.languages.default');
    }

    /**
     * Language used when there is no translation in the requested language.
     */
    public static function fallback(): string
    {
        return config('movie.languages.fallback');
    }

    /**
     * The language with the fallback language, for loading translations.
     *
     * @return string[]
     */
    public static function withFallback(?string $langCode = null): array
    {
        return array_values(array_unique([$langCode ?? self::default(), self::fallback()]));
    }

    /**
     * TMDB locale of the language (e.g. uk => uk-UA).
     */
    public static function tmdbLocale(string $langCode): string
    {
        return self::content()[$langCode] ?? $langCode;
    }
}
