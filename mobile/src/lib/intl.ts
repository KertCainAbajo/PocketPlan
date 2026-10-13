/**
 * Cached Intl formatters. Creating an Intl.NumberFormat / DateTimeFormat is
 * slow on Hermes (milliseconds each), and screens format dozens of amounts and
 * dates per render, so each distinct locale + options pair is built once and
 * reused. Drop-in for `new Intl.NumberFormat(...)` / `new Intl.DateTimeFormat(...)`.
 */
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

const keyOf = (locale: string | string[] | undefined, options: object | undefined) => `${String(locale)}|${JSON.stringify(options ?? {})}`;

export function cachedNumberFormat(locale?: string | string[], options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = keyOf(locale, options);
  let format = numberFormats.get(key);
  if (!format) {
    // Throws for an invalid currency, exactly like the constructor; callers already catch that.
    format = new Intl.NumberFormat(locale, options);
    numberFormats.set(key, format);
  }
  return format;
}

export function cachedDateTimeFormat(locale?: string | string[], options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = keyOf(locale, options);
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options);
    dateFormats.set(key, format);
  }
  return format;
}
