<?php

namespace App\Http\Resources\V1;

use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Expense */
class ExpenseResource extends JsonResource
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
            'payment_method' => $this->payment_method?->value,
            'spent_on' => $this->spent_on->toDateString(),
            'spent_time' => $this->spent_time ? substr($this->spent_time, 0, 5) : null,
            'budget_id' => $this->budget_id,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
