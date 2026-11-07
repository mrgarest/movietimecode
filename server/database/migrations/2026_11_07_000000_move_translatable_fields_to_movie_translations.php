<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movie_translations', function (Blueprint $table) {
            $table->string('trailer')->nullable();
            $table->text('overview')->nullable();
        });

        // Copy original-language data from movies into movie_translations.
        // Insert a new row only when no row with that lang_code already exists for the movie.
        DB::statement("
            INSERT INTO movie_translations (movie_id, lang_code, title, poster_path, backdrop_path, storage_id, created_at, updated_at)
            SELECT
                m.id,
                m.lang_code,
                m.title,
                m.poster_path,
                m.backdrop_path,
                m.storage_id,
                m.created_at,
                NOW()
            FROM movies m
            WHERE m.title IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM movie_translations mt
                WHERE mt.movie_id = m.id AND mt.lang_code = m.lang_code
              )
        ");

        // For movies that already have a translation in their original language,
        // fill in missing title/poster/backdrop from the movies row.
        DB::statement("
            UPDATE movie_translations mt
            SET
                title        = COALESCE(mt.title,        m.title),
                poster_path  = COALESCE(mt.poster_path,  m.poster_path),
                backdrop_path = COALESCE(mt.backdrop_path, m.backdrop_path)
            FROM movies m
            WHERE mt.movie_id  = m.id
              AND mt.lang_code = m.lang_code
              AND m.title IS NOT NULL
        ");

        Schema::table('movies', function (Blueprint $table) {
            $table->dropColumn(['title', 'poster_path', 'backdrop_path']);
        });
    }

    public function down(): void
    {
        Schema::table('movies', function (Blueprint $table) {
            $table->string('title')->nullable()->index();
            $table->string('poster_path', 2083)->nullable();
            $table->string('backdrop_path', 2083)->nullable();
        });

        // Restore from the original-language translation row
        DB::statement("
            UPDATE movies m
            SET
                title         = mt.title,
                poster_path   = mt.poster_path,
                backdrop_path = mt.backdrop_path
            FROM movie_translations mt
            WHERE mt.movie_id  = m.id
              AND mt.lang_code = m.lang_code
        ");

        Schema::table('movie_translations', function (Blueprint $table) {
            $table->dropColumn(['trailer', 'overview']);
        });
    }
};
