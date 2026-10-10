<?php

namespace App\Http\Requests\Concerns;

trait HasMoneyRules
{
    /**
     * A positive amount (or ≥ 0 when $allowZero) with at most two decimals.
     *
     * @return list<string>
     */
    protected function moneyRules(bool $allowZero = false, bool $required = true): array
    {
        return [
            $required ? 'required' : 'nullable',
            'numeric',
            'decimal:0,2',
            $allowZero ? 'min:0' : 'gt:0',
            'max:'.config('pocketplan.max_amount'),
        ];
    }

    /** "Today" in the student's timezone, for before_or_equal rules. */
    protected function userToday(): string
    {
        return $this->user()->today()->toDateString();
    }
}
