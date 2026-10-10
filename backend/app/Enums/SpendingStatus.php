<?php

namespace App\Enums;

/** How today's spending compares with the recommended daily amount. */
enum SpendingStatus: string
{
    case Safe = 'safe';
    case Watch = 'watch';
    case Over = 'over';

    public function label(): string
    {
        return match ($this) {
            self::Safe => 'Safe',
            self::Watch => 'Watch Your Spending',
            self::Over => 'Over Budget',
        };
    }
}
