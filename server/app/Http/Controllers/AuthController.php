<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use Cookie;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Redirect;

class AuthController extends Controller
{
    public function __construct(
        protected AuthService $authService
    ) {}

    /**
     * Log out the user by revoking the token, clearing the session and cookies.
     * @param Request $request
     * @return RedirectResponse
     */
    public function logout(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user) {
            if ($user->token()) {
                $user->token()->revoke();
            }

            Auth::guard('web')->logout();
        }

        // Clear the session and log out the user
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Clear cookies
        Cookie::queue(Cookie::forget('uat'));
        Cookie::queue(Cookie::forget('us'));

        return Redirect::to('/');
    }

    public function extension()
    {
        return $this->authService->login(AuthService::TARGET_EXTENSION);
    }

    public function server()
    {
        return $this->authService->login(AuthService::TARGET_SERVER);
    }

    public function callback()
    {
        $data = $this->authService->callback();

        if ($data->target === AuthService::TARGET_SERVER) {
            return Redirect::to('/dashboard');
        }
        return view('auth', ['jsonPageData' => $data->toArray()]);
    }
}
