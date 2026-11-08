<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class GenreSeeder extends Seeder
{
    /**
     * TMDB movie genres: slug (from the English name) => [lang_code => name]
     */
    private const GENRES = [
        'action'          => ['en' => 'Action',          'uk' => 'Бойовик'],
        'adventure'       => ['en' => 'Adventure',       'uk' => 'Пригоди'],
        'animation'       => ['en' => 'Animation',       'uk' => 'Мультфільм'],
        'comedy'          => ['en' => 'Comedy',          'uk' => 'Комедія'],
        'crime'           => ['en' => 'Crime',           'uk' => 'Кримінал'],
        'documentary'     => ['en' => 'Documentary',     'uk' => 'Документальний'],
        'drama'           => ['en' => 'Drama',           'uk' => 'Драма'],
        'family'          => ['en' => 'Family',          'uk' => 'Сімейний'],
        'fantasy'         => ['en' => 'Fantasy',         'uk' => 'Фентезі'],
        'history'         => ['en' => 'History',         'uk' => 'Історичний'],
        'horror'          => ['en' => 'Horror',          'uk' => 'Жахи'],
        'music'           => ['en' => 'Music',           'uk' => 'Музика'],
        'mystery'         => ['en' => 'Mystery',         'uk' => 'Детектив'],
        'romance'         => ['en' => 'Romance',         'uk' => 'Мелодрама'],
        'science-fiction' => ['en' => 'Science Fiction', 'uk' => 'Фантастика'],
        'tv-movie'        => ['en' => 'TV Movie',        'uk' => 'Телефільм'],
        'thriller'        => ['en' => 'Thriller',        'uk' => 'Трилер'],
        'war'             => ['en' => 'War',             'uk' => 'Військовий'],
        'western'         => ['en' => 'Western',         'uk' => 'Вестерн'],
    ];

    /**
     * Seed TMDB movie genres with translations. Safe to run repeatedly.
     */
    public function run(): void
    {
        $now = Carbon::now();

        DB::table('genres')->insertOrIgnore(
            collect(self::GENRES)->keys()
                ->map(fn($slug) => ['slug' => $slug, 'created_at' => $now, 'updated_at' => $now])
                ->all()
        );

        $ids = DB::table('genres')->whereIn('slug', array_keys(self::GENRES))->pluck('id', 'slug');

        $translations = [];
        foreach (self::GENRES as $slug => $names) {
            foreach ($names as $langCode => $name) {
                $translations[] = [
                    'genre_id' => $ids[$slug],
                    'lang_code' => $langCode,
                    'name' => $name,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        DB::table('genre_translations')->insertOrIgnore($translations);
    }
}
