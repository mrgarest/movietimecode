<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventLogResource extends JsonResource
{
    // Disable the standard ‘data’ wrapper
    public static $wrap = null;

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'platform' => $this->type->platform,
            'device_token' => $this->deviceToken,
            'value' => $this->value,
            'description' => $this->description,
            'created_at' => $this->createdAt?->timestamp
        ];
    }
}
