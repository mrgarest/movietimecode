<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Movie extends Model
{
    use HasFactory;
    protected $fillable = [
        'storage_id',
        'tmdb_id',
        'imdb_id',
        'lang_code',
        'title',
        'duration',
        'poster_path',
        'backdrop_path',
        'rating_imdb',
        'release_date',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'storage_id' => 'int',
        'tmdb_id' => 'int',
        'imdb_id' => 'string',
        'duration' => 'int',
        'lang_code' => 'string',
        'title' => 'string',
        'poster_path' => 'string',
        'backdrop_path' => 'string',
        'release_date' => 'date',
        'rating_imdb' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static function fromCache(array $attributes): self
    {
        $instance = new static;
        $instance->setRawAttributes($attributes, true);
        $instance->exists = true;
        return $instance;
    }

    public function toCache(): array
    {
        return $this->getRawOriginal();
    }

    public function imdbContentRatings()
    {
        return $this->hasMany(ImdbContentRating::class, 'movie_id', 'id');
    }
    
    public function companies()
    {
        return $this->hasMany(MovieCompany::class);
    }

    public function timecodes()
    {
        return $this->hasMany(MovieTimecode::class);
    }

    public function timecodeSegments()
    {
        return $this->hasMany(MovieTimecodeSegment::class);
    }

    public function translations()
    {
        return $this->hasMany(MovieTranslation::class);
    }

    public static function findByTitle($title)
    {
        return self::where('title', 'ILIKE', "%$title%");
    }

    public function scopeTmdbId(Builder $query, int $tmdbId): Builder
    {
        return $query->where('tmdb_id', $tmdbId);
    }

    public function scopeTmdbIds(Builder $query, array $tmdbIds): Builder
    {
        return $query->whereIn('tmdb_id', $tmdbIds);
    }

    /**
     * Scope for searching for a movie by titles list and release year.
     */
    public function scopeFindByTitlesYear(Builder $query, array $titles, ?int $year = null): Builder
    {
        return $query->where(function (Builder $q) use ($titles) {
            foreach ($titles as $t) {
                $t = trim($t);
                $q->orWhere('title', 'ILIKE', "%{$t}%")
                    ->orWhereHas('translations', fn($tr) => $tr->where('title', 'ILIKE', "%{$t}%"));
            }
        })
            ->when($year, function (Builder $q, $year) {
                $q->whereBetween('release_date', [
                    ($year - 1) . "-01-01",
                    ($year + 1) . "-12-31"
                ]);
            });
    }
}
