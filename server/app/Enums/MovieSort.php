<?php

namespace App\Enums;

/**
 * Sorting of the movie list with timecodes.
 */
enum MovieSort: string
{
    // By the date the latest timecode was added
    case ADDED = 'added';

    // By release date, newest first
    case RELEASE_DESC = 'release_desc';

    // By release date, oldest first
    case RELEASE_ASC = 'release_asc';
}
