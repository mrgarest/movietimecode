<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\SoftDeletes;

class MovieTimecode extends Model
{
    use HasFactory, SoftDeletes, Prunable;
    protected $table = 'movie_tcs';

    protected $fillable = [
        'user_id',
        'movie_id',
        'duration',
        'like_count',
        'dislike_count',
        'used_count',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'user_id' => 'int',
        'movie_id' => 'int',
        'duration' => 'int',
        'like_count' => 'int',
        'dislike_count' => 'int',
        'used_count' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Automatic deletion of deleted timecodes.
     */
    public function prunable(): Builder
    {
        return static::onlyTrashed()->where('deleted_at', '<=', Carbon::now()->subMonth());
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function movie()
    {
        return $this->belongsTo(Movie::class, 'movie_id');
    }

    public function segments()
    {
        return $this->hasMany(MovieTimecodeSegment::class, 'timecode_id');
    }

    public function twitchContentClassification()
    {
        return $this->hasMany(MovieTimecodeTwitchContentClassification::class, 'timecode_id');
    }

    public function scopeUserId(Builder $query, $id): Builder
    {
        return $query->where('user_id', $id);
    }

    public function scopeMovieId(Builder $query, $id): Builder
    {
        return $query->where('movie_id', $id);
    }
}
