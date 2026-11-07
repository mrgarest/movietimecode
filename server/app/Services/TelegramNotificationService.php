<?php

namespace App\Services;

use App\Models\Movie;
use App\Models\User;
use App\Notifications\AddedTimecodeNotifi;
use Carbon\Carbon;
use Illuminate\Support\Facades\Notification;

class TelegramNotificationService
{
    private ?array $telegram = null;

    public function __construct()
    {
        $telegram = config('services.telegram-bot-api');
        if ($telegram['sendAddedTimecode'] && $telegram['token'] && $telegram['chat_id']) $this->telegram = $telegram;
    }

    /**
     * Sending a notification about a new timecodes.
     *
     * @param User $user
     * @param Movie $movie
     * @param int $segments
     */
    public function newTimecodesAdded(User $user, Movie $movie, int $segments)
    {
        $movie->loadMissing('originalTranslation');

        Notification::route('telegram', $this->telegram['chat_id'])->notify(new AddedTimecodeNotifi(
            $user->id,
            $user->username,
            $movie->id,
            $movie->originalTranslation?->title ?? 'N/A',
            $segments,
            Carbon::now()
        ));
    }
}
