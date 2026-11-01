import { MAX_ALERT_COUNT } from "./candleAlerts";

export interface Defaults {
  intervalMinutes: number;
  leadMinutes: number;
  count: number;
  sameDayOnly: boolean;
}

export const DEFAULT_VALUES: Defaults = {
  intervalMinutes: 15,
  leadMinutes: 2,
  count: 2,
  sameDayOnly: false,
};

function toInt(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isInteger(n)) return null;
  return n;
}

// Validates each field independently; invalid or missing fields fall back to
// the built-in default so one corrupt value never discards the others.
export function sanitizeDefaults(raw: unknown): Defaults {
  const obj =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const interval = toInt(obj.intervalMinutes);
  const lead = toInt(obj.leadMinutes);
  const count = toInt(obj.count);

  return {
    intervalMinutes:
      interval !== null && interval >= 1
        ? interval
        : DEFAULT_VALUES.intervalMinutes,
    leadMinutes:
      lead !== null && lead >= 0 ? lead : DEFAULT_VALUES.leadMinutes,
    count:
      count !== null && count >= 1 && count <= MAX_ALERT_COUNT
        ? count
        : DEFAULT_VALUES.count,
    sameDayOnly:
      typeof obj.sameDayOnly === "boolean"
        ? obj.sameDayOnly
        : DEFAULT_VALUES.sameDayOnly,
  };
}

// Strict check for the settings form: returns an error message or null.
export function validateDefaults(d: {
  intervalMinutes: string;
  leadMinutes: string;
  count: string;
}): string | null {
  const interval = toInt(d.intervalMinutes);
  if (interval === null || interval < 1) {
    return "Interval must be a whole number of at least 1 minute";
  }
  const lead = toInt(d.leadMinutes);
  if (lead === null || lead < 0) {
    return "Lead must be a whole number of 0 or more minutes";
  }
  const count = toInt(d.count);
  if (count === null || count < 1 || count > MAX_ALERT_COUNT) {
    return `Count must be a whole number between 1 and ${MAX_ALERT_COUNT}`;
  }
  return null;
}
