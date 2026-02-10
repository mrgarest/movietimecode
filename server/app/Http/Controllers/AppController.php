<?php

namespace App\Http\Controllers;

use App\Services\SeoService;
use Illuminate\Http\Request;

class AppController extends Controller
{
    public function __invoke(Request $request, SeoService $seoService)
    {
        $seoData = $seoService->getSeoData($request->path());
        return view('app', compact('seoData'));
    }
}
