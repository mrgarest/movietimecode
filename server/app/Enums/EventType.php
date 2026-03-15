<?php

namespace App\Enums;

enum EventType: string
{
    case INSTALLED = 'INSTALLED';
    case CHECK_MOVIE = 'CHECK_MOVIE';
    case TIMECODE_USED = 'TIMECODE_USED';
}
