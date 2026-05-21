<?php

namespace App\Enums;

enum RefreshMovieDataType: string
{
    case IMDB_INFO = 'imdb.info';
    case IMDB_CONTENT_RATINGS = 'imdb.content_ratings';
    case AZNUDE = 'aznude';
}
