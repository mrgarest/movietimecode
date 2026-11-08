<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GenreTranslation extends Model
{
    protected $fillable = [
        'genre_id',
        'lang_code',
        'name',
    ];

    protected $casts = [
        'genre_id' => 'int',
        'lang_code' => 'string',
        'name' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function genre()
    {
        return $this->belongsTo(Genre::class);
    }
}
