<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovieTranslation extends Model
{
    protected $fillable = [
        'movie_id',
        'storage_id',
        'lang_code',
        'title',
        'overview',
        'poster_path',
        'backdrop_path',
        'trailer',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'movie_id' => 'int',
        'storage_id' => 'int',
        'lang_code' => 'string',
        'title' => 'string',
        'overview' => 'string',
        'poster_path' => 'string',
        'backdrop_path' => 'string',
        'trailer' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

}
