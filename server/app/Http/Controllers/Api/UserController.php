<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SuccessResource;
use App\Http\Resources\Users\UsersResource;
use App\Services\UserService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();

        return new SuccessResource([
            'id' => $user->id,
            'role_id' => $user->role_id->value,
            'username' => $user->username,
            'picture' => $user->picture
        ]);
    }

    public function users(Request $request, UserService $userService)
    {
        $validated = $request->validate([
            'page' => 'required|integer|min:0',
            'q' => 'nullable|string|min:2'
        ]);

        $users = $userService->userList(
            page: $validated['page'],
            query: $validated['q'] ?? null
        );

        return new SuccessResource([
            'current_page' => $users->currentPage(),
            'last_page' => $users->lastPage(),
            'users' => UsersResource::collection($users)
        ]);
    }
}
