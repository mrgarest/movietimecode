<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Genre extends Model
{
    protected $fillable = [
        'slug',
    ];

    protected $casts = [
        'slug' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function translations()
    {
        return $this->hasMany(GenreTranslation::class);
    }

    public function translation(?string $langCode = null)
    {
        return $this->hasOne(GenreTranslation::class)
            ->where('lang_code', $langCode ?? app()->getLocale());
    }

    public function movies()
    {
        return $this->belongsToMany(Movie::class);
    }
}
