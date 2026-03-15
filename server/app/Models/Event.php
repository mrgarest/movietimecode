<?php

namespace App\Models;

use App\Enums\EventPlatform;
use App\Enums\EventType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    protected $fillable = [
        'device_token',
        'type',
        'platform',
        'value',
        'created_at',
        'updated_at'
    ];

    protected $casts = [
        'device_token' => 'string',
        'type' => EventType::class,
        'platform' => EventPlatform::class,
        'value' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Universal relationship based on event type.
     *
     * @param string $model Model class
     * @return \Illuminate\Database\Eloquent\Relations\BelongsTo
     */
    public function relation(string $model)
    {
        return $this->belongsTo($model, 'value', 'id');
    }

    public function movie()
    {
        return $this->relation(Movie::class);
    }

    public function timecode()
    {
        return $this->relation(MovieTimecode::class);
    }

    public function scopeDeviceToken(Builder $query, string $deviceToken): Builder
    {
        return $query->where('device_token', $deviceToken);
    }

    public function scopeType(Builder $query, EventType $type): Builder
    {
        return $query->where('type', $type->value);
    }

    public function scopeValue(Builder $query, $value): Builder
    {
        return $query->where('value', (string) $value);
    }
}
