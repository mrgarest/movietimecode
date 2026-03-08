<?php

namespace App\Http\Controllers\Api;

use App\Enums\EventType;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventLogResource;
use App\Http\Resources\SuccessResource;
use App\Services\EventService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Enum;

class EventController extends Controller
{
    public function __construct(
        protected EventService $eventService
    ) {}

    public function store(Request $request)
    {
        $validated = $request->validate([
            'device_token' => 'required|string',
            'type' => ['required', new Enum(EventType::class)],
            'value' => 'required|string|numeric',
        ]);

        $this->eventService->store(
            deviceToken: $validated['device_token'],
            type: EventType::from($validated['type']),
            value: $validated['value'],
        );

        return new SuccessResource(null);
    }


    public function eventLog(Request $request)
    {
        $validated = $request->validate(['page' => 'nullable|numeric']);

        $events = $this->eventService->getLatestPaginated(
            page: $validated['page'] ?? 1,
            langCode: 'uk'
        );

        return new SuccessResource([
            'current_page' => $events->currentPage(),
            'last_page' => $events->lastPage(),
            'events' => EventLogResource::collection($events),
        ]);
    }
}
