<?php

namespace App\Enums;

enum SavingsGoalStatus: string
{
    case Active = 'active';
    case Achieved = 'achieved';
    case Archived = 'archived';
}
