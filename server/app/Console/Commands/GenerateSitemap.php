<?php

namespace App\Console\Commands;

use App\Models\Movie;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Spatie\Sitemap\Sitemap;
use Spatie\Sitemap\Tags\Url;

class GenerateSitemap extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sitemap:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sitemap generation';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $sitemap = Sitemap::create();

        // Static Pages
        $sitemap->add(Url::create('/')
            ->setPriority(1.0)
            ->setChangeFrequency(Url::CHANGE_FREQUENCY_DAILY));

        $sitemap->add(Url::create('/movies/timecodes')
            ->setPriority(0.8)
            ->setChangeFrequency(Url::CHANGE_FREQUENCY_DAILY));

        // Dynamic Movie Pages
        Movie::select(['id', 'tmdb_id', 'updated_at'])
            ->orderByDesc('created_at')
            ->limit(1000)
            ->get()
            ->each(function (Movie $movie) use ($sitemap) {
                $sitemap->add(
                    Url::create("/movies/{$movie->tmdb_id}")
                        ->setLastModificationDate($movie->updated_at)
                        ->setPriority(0.8)
                        ->setChangeFrequency(Url::CHANGE_FREQUENCY_WEEKLY)
                );
            });

        // Save the file
        $sitemap->writeToFile(public_path('sitemap.xml'));
        $this->info('Sitemap generated successfully!');
    }
}
