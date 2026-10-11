<?php

namespace App\Http\Resources\V1;

use App\Models\Account;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Account */
class AccountResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'opening_balance' => $this->opening_balance,
            'balance' => Money::format($this->balance()),
            'is_default' => $this->is_default,
        ];
    }
}
