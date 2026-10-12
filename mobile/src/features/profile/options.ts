/** Currencies the server accepts (config/pocketplan.php). Display only: amounts are never converted. */
export const CURRENCIES = [
  { code: 'PHP', name: 'Philippine peso', flag: '🇵🇭' },
  { code: 'USD', name: 'US dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British pound', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese yen', flag: '🇯🇵' },
  { code: 'KRW', name: 'South Korean won', flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore dollar', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong dollar', flag: '🇭🇰' },
  { code: 'AUD', name: 'Australian dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian dollar', flag: '🇨🇦' },
] as const;

export const currencyName = (code: string | undefined) => CURRENCIES.find((c) => c.code === code)?.name ?? code ?? '';

/** Common IANA zones for students; the device's own zone is offered separately. */
export const TIMEZONES = [
  { id: 'Asia/Manila', label: 'Manila' },
  { id: 'Asia/Singapore', label: 'Singapore' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { id: 'Asia/Tokyo', label: 'Tokyo' },
  { id: 'Asia/Seoul', label: 'Seoul' },
  { id: 'Asia/Dubai', label: 'Dubai' },
  { id: 'Australia/Sydney', label: 'Sydney' },
  { id: 'Europe/London', label: 'London' },
  { id: 'Europe/Paris', label: 'Paris' },
  { id: 'America/New_York', label: 'New York' },
  { id: 'America/Chicago', label: 'Chicago' },
  { id: 'America/Los_Angeles', label: 'Los Angeles' },
  { id: 'America/Toronto', label: 'Toronto' },
] as const;

export function deviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** "Manila" for Asia/Manila; falls back to the last path segment. */
export const timezoneLabel = (id: string | undefined) =>
  TIMEZONES.find((zone) => zone.id === id)?.label ?? id?.split('/').pop()?.replace(/_/g, ' ') ?? '';

/** Current local time in a zone, e.g. "8:42 PM". */
export function timeIn(zone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: zone }).format(new Date());
  } catch {
    return '';
  }
}
