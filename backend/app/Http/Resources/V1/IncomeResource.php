<?php

namespace App\Http\Resources\V1;

use App\Models\Income;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Income */
class IncomeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'account_id' => $this->account_id,
            'amount' => $this->amount,
            'description' => $this->description,
            'notes' => $this->notes,
            'received_on' => $this->received_on->toDateString(),
            'received_time' => $this->received_time ? substr($this->received_time, 0, 5) : null,
            'recurring_income_id' => $this->recurring_income_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
