<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('movies', function (Blueprint $table) {
            $table->unsignedBigInteger('tmdb_id')->unique()->nullable()->after('storage_id');
            $table->string('imdb_id', 20)->unique()->nullable()->after('tmdb_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movies', function (Blueprint $table) {
            $table->dropUnique(['tmdb_id']);
            $table->dropUnique(['imdb_id']);

            $table->dropColumn(['tmdb_id', 'imdb_id']);
        });
    }
};
