import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { getErrorMessage, getFieldErrors } from './api-client';

/**
 * Puts Laravel 422 messages on the matching form fields. Returns a banner
 * message for anything that could not be attached to a field (or null).
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
  fieldMap: Record<string, string> = {},
): string | null {
  const fieldErrors = getFieldErrors(error);
  let attached = 0;

  for (const [serverField, message] of Object.entries(fieldErrors)) {
    const field = fieldMap[serverField] ?? serverField;
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
      attached++;
    }
  }

  return attached > 0 && attached === Object.keys(fieldErrors).length ? null : getErrorMessage(error);
}
