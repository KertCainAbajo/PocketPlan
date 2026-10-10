<?php

namespace App\Enums;

use Carbon\CarbonImmutable;

/** Length of a budget period. */
enum AllowanceFrequency: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Monthly = 'monthly';
    case Custom = 'custom';

    /** Inclusive end date for a period starting on $start; null for custom (client must choose). */
    public function defaultEndDate(CarbonImmutable $start): ?CarbonImmutable
    {
        return match ($this) {
            self::Daily => $start,
            self::Weekly => $start->addDays(6),
            self::Monthly => $start->addMonthNoOverflow()->subDay(),
            self::Custom => null,
        };
    }

    /** The matching recurring-income frequency, if the allowance repeats on a schedule. */
    public function recurrence(): ?RecurrenceFrequency
    {
        return match ($this) {
            self::Daily => RecurrenceFrequency::Daily,
            self::Weekly => RecurrenceFrequency::Weekly,
            self::Monthly => RecurrenceFrequency::Monthly,
            self::Custom => null,
        };
    }
}
