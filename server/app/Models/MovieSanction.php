<?php

namespace App\Models;

use App\Enums\SanctionReason;
use App\Enums\SanctionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class MovieSanction extends Model
{
    protected $fillable = [
        'movie_id',
        'device_token',
        'user_id',
        'username',
        'type',
        'reason',
        'comment',
        'file_name',
        'occurred_at',
        'approved_at',
        'approved_by',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'movie_id' => 'int',
        'device_token' => 'string',
        'user_id' => 'int',
        'username' => 'string',
        'type' => SanctionType::class,
        'reason' => SanctionReason::class,
        'comment' => 'string',
        'file_name' => 'string',
        'occurred_at' => 'date',
        'approved_at' => 'datetime',
        'approved_by' => 'int',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];


    protected static function booted()
    {
        static::deleting(function (MovieSanction $report) {
            if ($report->file_name) {
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function approvedUser()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function movie()
    {
        return $this->belongsTo(Movie::class, 'movie_id');
    }

    public function scopeMovieId(Builder $query, int $id): Builder
    {
        return $query->where('movie_id', $id);
    }

    public function scopeUsername(Builder $query, string $username): Builder
    {
        return $query->where('username', $username);
    }

    public function scopeDeviceToken(Builder $query, string $deviceToken): Builder
    {
        return $query->where('device_token', $deviceToken);
    }
    
    public function scopeApproved(Builder $query): Builder
    {
        return $query->whereNotNull('approved_at');
    }
}
