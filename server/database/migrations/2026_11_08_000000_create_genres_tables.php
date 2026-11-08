<?php

use App\Models\Genre;
use App\Models\Movie;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('genres', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('genre_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(Genre::class)->constrained()->cascadeOnDelete();
            $table->string('lang_code', 5);
            $table->string('name');
            $table->timestamps();

            $table->unique(['genre_id', 'lang_code']);
        });

        Schema::create('genre_movie', function (Blueprint $table) {
            $table->foreignIdFor(Genre::class)->constrained()->cascadeOnDelete();
            $table->foreignIdFor(Movie::class)->constrained()->cascadeOnDelete();

            $table->primary(['genre_id', 'movie_id']);
            $table->index('movie_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('genre_movie');
        Schema::dropIfExists('genre_translations');
        Schema::dropIfExists('genres');
    }
};
