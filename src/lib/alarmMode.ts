export type AlarmMode = "clock" | "app";

export const DEFAULT_ALARM_MODE: AlarmMode = "clock";

export const APP_MODE_AVAILABLE = true;

export function sanitizeAlarmMode(raw: unknown): AlarmMode {
  if (raw === "app" && APP_MODE_AVAILABLE) return "app";
  return DEFAULT_ALARM_MODE;
}
