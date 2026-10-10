<?php

namespace App\Support;

use Brick\Math\BigDecimal;
use Brick\Math\BigNumber;
use Brick\Math\RoundingMode;
use Illuminate\Contracts\Database\Query\Builder as QueryBuilder;

/**
 * Exact decimal arithmetic for money. Amounts travel as strings ("1350.00");
 * floats are never used for financial values.
 */
final class Money
{
    public const SCALE = 2;

    /**
     * Accepts values straight from the database: DECIMAL strings, or the int 0
     * that an aggregate returns for no rows.
     */
    public static function of(BigNumber|int|string|null $amount): BigDecimal
    {
        return BigDecimal::of($amount ?? 0);
    }

    /** Exact sum of a query's money column (0.00 for no rows). */
    public static function sum(QueryBuilder $query, string $column = 'amount'): BigDecimal
    {
        $sum = $query->sum($column);

        return BigDecimal::of(is_float($sum) ? number_format($sum, self::SCALE, '.', '') : $sum);
    }

    public static function zero(): BigDecimal
    {
        return BigDecimal::zero();
    }

    /** Two-decimal string for API responses, rounded half-up. */
    public static function format(BigNumber|int|string $amount): string
    {
        return (string) BigDecimal::of($amount)->toScale(self::SCALE, RoundingMode::HalfUp);
    }

    /** $a ÷ $b rounded half-up to two decimals. */
    public static function divide(BigDecimal $a, int $b): BigDecimal
    {
        return $a->dividedBy($b, self::SCALE, RoundingMode::HalfUp);
    }

    public static function max(BigDecimal $a, BigDecimal $b): BigDecimal
    {
        return $a->isGreaterThan($b) ? $a : $b;
    }

    public static function min(BigDecimal $a, BigDecimal $b): BigDecimal
    {
        return $a->isLessThan($b) ? $a : $b;
    }

    /** Whole-number percentage of $part in $whole (0 when $whole is zero and nothing was used). */
    public static function percent(BigDecimal $part, BigDecimal $whole): int
    {
        if ($whole->isZero()) {
            return $part->isPositive() ? 100 : 0;
        }

        return $part->multipliedBy(100)->dividedBy($whole, 0, RoundingMode::Down)->toInt();
    }
}
