<?php

namespace App\Enums;

/** Lifecycle of a budget relative to today (in the student's timezone). */
enum BudgetState: string
{
    case Upcoming = 'upcoming';
    case Active = 'active';
    /** Past its end date but not yet marked completed. */
    case Ended = 'ended';
    case Completed = 'completed';
}
