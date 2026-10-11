<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AccountRequest;
use App\Http\Resources\V1\AccountResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AccountController extends Controller
{
    /** List only this student's accounts, creating their default wallet on first use. */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $user->ensureDefaultAccount();

        return AccountResource::collection($user->accounts()->orderByDesc('is_default')->orderBy('name')->get());
    }

    public function store(AccountRequest $request): JsonResponse
    {
        $account = $request->user()->accounts()->create($request->validated());

        return (new AccountResource($account))->response()->setStatusCode(201);
    }
}
