<?php

namespace App\Enums;

use Carbon\CarbonImmutable;

/** How often a recurring income is paid. */
enum RecurrenceFrequency: string
{
    case Daily = 'daily';
    case Weekly = 'weekly';
    case Biweekly = 'biweekly';
    case Monthly = 'monthly';

    /**
     * Date of the n-th payment (0 = the start date). Always computed from the
     * start date, so a schedule starting Jan 31 pays Feb 28, then Mar 31.
     */
    public function occurrence(CarbonImmutable $start, int $n): CarbonImmutable
    {
        return match ($this) {
            self::Daily => $start->addDays($n),
            self::Weekly => $start->addWeeks($n),
            self::Biweekly => $start->addWeeks(2 * $n),
            self::Monthly => $start->addMonthsNoOverflow($n),
        };
    }
}
