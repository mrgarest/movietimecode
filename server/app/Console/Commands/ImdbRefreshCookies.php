<?php

namespace App\Console\Commands;

use App\Clients\ImdbClient;
use Illuminate\Console\Command;

class ImdbRefreshCookies extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'imdb:refresh-cookies';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle(ImdbClient $client)
    {
        if (!config('browserless.enabled')) return;

        $client->refreshCookies();
    }
}
