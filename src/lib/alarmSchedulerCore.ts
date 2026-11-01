/**
 * alarmSchedulerCore.ts
 *
 * Platform-agnostic scheduling facade for candle alerts.
 * Implements are provided by alarmScheduler.android.ts and alarmScheduler.ios.ts
 */

import { CandleAlert } from "./candleAlerts";

export interface AlarmSchedulerCapabilities {
  // Scheduling keeps running while the app is in the background.
  background: boolean;
  // Alarms can be listed and cancelled from inside this app.
  manageAlarms: boolean;
}

export interface PendingAlarm {
  id: number;
  time: Date;
  label: string;
}

export type PermissionResult =
  | { ok: true }
  | { ok: false; message: string; openSettings?: () => Promise<void> };

export interface AlarmScheduler {
  capabilities: AlarmSchedulerCapabilities;
  ensurePermissions?(): Promise<PermissionResult>;
  listPending?(): Promise<PendingAlarm[]>;
  cancel?(id: number): Promise<void>;
  cancelAll?(): Promise<void>;
  scheduleCandleAlerts(alerts: CandleAlert[]): Promise<CandleAlert[]>;
  openClockApp(): Promise<void>;
}

let schedulerInstance: AlarmScheduler | null = null;

export function setAlarmScheduler(scheduler: AlarmScheduler): void {
  schedulerInstance = scheduler;
}

export function getAlarmScheduler(): AlarmScheduler {
  if (!schedulerInstance) {
    throw new Error(
      "Alarm scheduler not initialized. Call setAlarmScheduler() first.",
    );
  }
  return schedulerInstance;
}
