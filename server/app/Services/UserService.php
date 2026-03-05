<?php

namespace App\Services;

use App\Models\User;

class UserService
{
    /**
     * User list 
     * @param int $page
     * @param string|null $query
     */
    public function userList(int $page = 1, ?string $query = null)
    {
        return User::query()
            ->withTrashed()
            ->select('id', 'username', 'picture', 'created_at', 'last_login_at', 'deleted_at')
            ->when($query, function ($q, $query) {
                $q->where(function ($qs) use ($query) {
                    $qs->where('username', 'ILIKE', "%{$query}%");
                });
            })
            ->latest()
            ->paginate(20, ['*'], 'page', $page);
    }
}
