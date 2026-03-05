<?php

namespace App\Http\Resources\Users;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsersResource extends JsonResource
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
            'is_deleted' => $this->when($this->trashed(), true),
            'username' => $this->username,
            'picture' => $this->picture,
            'created_at' => $this->created_at?->timestamp,
            'last_login_at' => $this->last_login_at?->timestamp,
        ];
    }
}
