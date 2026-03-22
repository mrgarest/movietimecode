<?php

namespace App\Enums;

enum TimecodeTag: int
{
    case NUDITY = 100;
    case VIOLENCE = 101;
    case SENSITIVE_EXPRESSIONS = 102;
    case SEXUAL_CONTENT_WITHOUT_NUDITY = 103;
    case USE_DRUGS_ALCOHOL_TOBACCO = 104;
    case PROHIBITED_SYMBOLS = 105;
    case EROTIC_SOUNDS = 106;
}
