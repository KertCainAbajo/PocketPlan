<?php

namespace App\Http\Resources\V1;

use App\Models\Budget;
use App\Services\Budget\BudgetSummaryService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A budget with its calculated summary. Category-limit progress is included
 * when the categoryLimits relation has been loaded (detail views).
 *
 * @mixin Budget
 */
class BudgetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $summaries = app(BudgetSummaryService::class);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'spending_limit' => $this->spending_limit,
            'frequency' => $this->frequency->value,
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date->toDateString(),
            'status' => $this->status->value,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'summary' => $summaries->summarize($this->resource)->toArray(),
            'category_limits' => $this->when(
                $this->resource->relationLoaded('categoryLimits'),
                fn () => $summaries->categoryLimits($this->resource),
            ),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
