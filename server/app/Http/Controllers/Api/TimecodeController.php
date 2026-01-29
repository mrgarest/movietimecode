<?php

namespace App\Http\Controllers\Api;

use App\DTO\Timecode\Editor\TimecodeEditData;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\TimecodeEditRequest;
use App\Http\Resources\SuccessResource;
use App\Http\Resources\Timecode\TimecodeAuthorResource;
use App\Http\Resources\Timecode\TimecodeEditorResource;
use App\Http\Resources\Timecode\TimecodeResource;
use App\Services\MovieService;
use App\Services\TimecodeService;
use Illuminate\Http\Request;

class TimecodeController extends Controller
{
    public function __construct(
        protected TimecodeService $timecodeService
    ) {}

    /**
     * Get a collection of timecode authors with timecode information.
     */
    public function authors(int $movieId)
    {
        return new SuccessResource([
            'authors' => TimecodeAuthorResource::collection($this->timecodeService->getAuthors($movieId))
        ]);
    }

    /**
     * Get timecodes for a movie from a specific author.
     */
    public function timecodes(int $timecodeId)
    {
        $data = $this->timecodeService->getTimecodes($timecodeId);
        if (!$data) throw ApiException::notFound();

        return new TimecodeResource($data);
    }

    /**
     * Adds new timecodes to the database.
     *
     * @param TimecodeEditRequest $request
     * @param int $movieId TMDB ID
     * @param MovieService $movieService
     */
    public function new(TimecodeEditRequest $request, int $movieId, MovieService $movieService)
    {
        $this->timecodeService->new(
            data: TimecodeEditData::fromRequest($request->validated()),
            tmdbId: $movieId,
            user: $request->user(),
            movieService: $movieService,
        );

        return new SuccessResource(null);
    }

    /**
     * Editing existing timecodes for a movie.
     *
     * @param TimecodeEditRequest $request
     * @param int $timecodeId
     */
    public function edit(TimecodeEditRequest $request, int $timecodeId)
    {
        $this->timecodeService->edit(
            data: TimecodeEditData::fromRequest($request->validated()),
            timecodeId: $timecodeId,
            user: $request->user()
        );

        return new SuccessResource(null);
    }

    /**
     * Get information for the timecode editor.
     */
    public function editor(Request $request, int $timecodeId)
    {
        $data = $this->timecodeService->editor(
            user: $request->user(),
            timecodeId: $timecodeId
        );
        if (!$data) throw ApiException::notFound();

        return new TimecodeEditorResource($data);
    }

    /**
     * Deleting timecodes.
     */
    public function delete(Request $request, int $timecodeId)
    {
        $validated = $request->validate([
            'force' => 'nullable|boolean'
        ]);

        $this->timecodeService->delete(
            user: $request->user(),
            timecodeId: $timecodeId,
            force: $validated['force'] ?? false
        );

        return new SuccessResource(null);
    }
}
