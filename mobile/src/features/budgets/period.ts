import { cachedDateTimeFormat, cachedNumberFormat } from '@/lib/intl';

export type PeriodFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const PERIOD_WORD: Record<PeriodFrequency, string> = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };
export const PERIOD_LABEL: Record<PeriodFrequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

/** Quick amounts sized to the period, so a daily budget is not offered ₱20,000. */
export const QUICK_AMOUNTS: Record<PeriodFrequency, number[]> = {
  daily: [100, 200, 300, 500],
  weekly: [500, 1000, 1500, 2000],
  monthly: [2000, 4000, 6000, 8000],
  yearly: [20000, 50000, 80000, 100000],
};

export const toDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const fromDateString = (value: string) => new Date(`${value}T12:00:00`);
export const longDate = (value: string) => cachedDateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(fromDateString(value));
export const shortDate = (value: string) => cachedDateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(fromDateString(value));

/** Adds months without spilling into the next month (Jan 31 + 1 month = Feb 28), like the server. */
function addMonthsNoOverflow(date: Date, months: number) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

/** Mirrors AllowanceFrequency::defaultEndDate on the server so previews match what is saved. */
export function endDateFor(start: string, frequency: PeriodFrequency) {
  const date = fromDateString(start);
  if (frequency === 'daily') return start;
  if (frequency === 'weekly') { date.setDate(date.getDate() + 6); return toDateString(date); }
  const next = addMonthsNoOverflow(date, frequency === 'monthly' ? 1 : 12);
  next.setDate(next.getDate() - 1);
  return toDateString(next);
}

export const daysBetween = (start: string, end: string) => Math.round((fromDateString(end).getTime() - fromDateString(start).getTime()) / 86400000) + 1;

/** "₱1,500.00" in the student's currency, falling back to "PHP 1500.00" if the device lacks it. */
export function formatCurrency(amount: number, currency: string, decimals = 2) {
  try { return cachedNumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount); }
  catch { return `${currency} ${amount.toFixed(decimals)}`; }
}

/** Just the symbol, e.g. "₱" for PHP. */
export function currencySymbol(currency: string) {
  return formatCurrency(0, currency, 0).replace(/[\d\s.,]/g, '') || currency;
}
