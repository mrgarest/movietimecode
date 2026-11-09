<?php

namespace App\Http\Controllers\Api;

use App\Helpers\Language;
use App\Http\Controllers\Controller;
use App\Http\Resources\SuccessResource;
use App\Http\Resources\Timecode\UserTimecodeResource;
use App\Models\Movie;
use App\Models\MovieTimecode;
use App\Models\User;
use App\Services\TimecodeService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function statistics()
    {
        return new SuccessResource([
            'movie_count' => Movie::count(),
            'timecode_count' => MovieTimecode::count(),
            'user_count' => User::count(),
        ]);
    }

    public function timecodes(Request $request, TimecodeService $service)
    {
        $validated = $request->validate([
            'page' => 'nullable|numeric',
            'sort' => 'nullable|string',
        ]);

        return new SuccessResource([
            'timecodes' => UserTimecodeResource::collection($service->getLatestPaginated(
                page: $validated['page'] ?? 1,
                langCode: Language::default(),
                user: null,
                sortBy: $validated['sort'] ?? 'latest',
                canSeeTrashed: true
            )),
        ]);
    }
}
