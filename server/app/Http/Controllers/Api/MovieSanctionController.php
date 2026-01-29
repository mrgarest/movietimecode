<?php

namespace App\Http\Controllers\Api;

use App\Enums\SanctionReason;
use App\Enums\SanctionType;
use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\Movie\MovieSanctionResource;
use App\Http\Resources\SuccessResource;
use App\Models\MovieSanction;
use App\Services\MovieSanctionService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class MovieSanctionController extends Controller
{
    public function __construct(
        protected MovieSanctionService $sanctionService
    ) {}

    public function report(Request $request)
    {
        $validated = $request->validate([
            'movie_id' => 'required_without:tmdb_id|nullable|integer|exists:movies,id',
            'tmdb_id' => 'required_without:movie_id|nullable|integer',

            'device_token' => 'required|string|max:64',
            'username' => 'required|string|min:2|max:60',

            'type' => ['required', new Enum(SanctionType::class)],
            'reason' => ['nullable', new Enum(SanctionReason::class)],

            'comment' => 'nullable|string|min:2|max:256',
            'image' => 'nullable|file|max:5120',
            'occurred_at' => 'nullable|date',
        ]);

        $this->sanctionService->report(
            movieId: !empty($validated['movie_id']) ? (int) $validated['movie_id'] : null,
            tmdbId: !empty($validated['tmdb_id']) ? (int) $validated['tmdb_id'] : null,
            deviceToken: $validated['device_token'],
            username: $validated['username'],
            type: SanctionType::from((int) $validated['type']),
            reason: !empty($validated['reason']) ? SanctionReason::tryFrom((int) $validated['reason']) : null,
            comment: $validated['comment'] ?? null,
            file: $request->file('image'),
            occurredAt: !empty($validated['occurred_at']) ? Carbon::createFromFormat('Y-m-d', $validated['occurred_at'])->startOfDay() : null
        );

        return new SuccessResource(null);
    }

    public function approve(Request $request, $id)
    {
        $sanction = MovieSanction::find($id);
        if (!$sanction) throw ApiException::notFound();

        $this->sanctionService->approve(
            user: $request->user(),
            sanction: $sanction
        );

        return new SuccessResource(null);
    }

    public function delete($id)
    {
        MovieSanction::find($id)->delete();

        return new SuccessResource(null);
    }

    public function list(Request $request)
    {
        $validated = $request->validate([
            'page' => 'nullable|numeric',
            'filter' => 'nullable|string',
        ]);

        return new SuccessResource([
            'sanctions' => MovieSanctionResource::collection($this->sanctionService->getLatestPaginated(
                page: $validated['page'] ?? 1,
                langCode: 'uk',
                filter: $validated['filter'] ?? 'unapproved'
            )),
        ]);
    }
}
