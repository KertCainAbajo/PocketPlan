<?php

namespace App\Http\Controllers\Api\V1;

use App\Exceptions\ConflictException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\AccountRequest;
use App\Http\Resources\V1\AccountResource;
use App\Models\Account;
use App\Models\SavingsContribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

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

    public function update(AccountRequest $request, int $account): AccountResource
    {
        $model = $this->find($request, $account);
        $model->fill($request->validated())->save();

        return new AccountResource($model->refresh());
    }

    /**
     * Removes an account. Its transactions and contributions move to the
     * default account so no recorded money disappears from the balances.
     */
    public function destroy(Request $request, int $account): Response
    {
        $model = $this->find($request, $account);
        if ($model->is_default) {
            throw new ConflictException('Your default account cannot be deleted.');
        }

        DB::transaction(function () use ($request, $model) {
            $default = $request->user()->ensureDefaultAccount();
            $model->expenses()->update(['account_id' => $default->id]);
            $model->incomes()->update(['account_id' => $default->id]);
            SavingsContribution::query()->where('account_id', $model->id)->update(['account_id' => $default->id]);
            $model->delete();
        });

        return response()->noContent();
    }

    private function find(Request $request, int $id): Account
    {
        return $request->user()->accounts()->findOrFail($id);
    }
}
