/**
 * alarmSchedulerCore.ts
 *
 * Platform-agnostic scheduling facade for candle alerts.
 * Implements are provided by alarmScheduler.android.ts and alarmScheduler.ios.ts
 */

import { CandleAlertOptions, CandleAlert } from './candleAlerts';

export interface AlarmScheduler {
  scheduleTodaysCandleAlerts(opts: CandleAlertOptions): Promise<CandleAlert[]>;
  openClockApp(): Promise<void>;
}

let schedulerInstance: AlarmScheduler | null = null;

export function setAlarmScheduler(scheduler: AlarmScheduler): void {
  schedulerInstance = scheduler;
}

export function getAlarmScheduler(): AlarmScheduler {
  if (!schedulerInstance) {
    throw new Error('Alarm scheduler not initialized. Call setAlarmScheduler() first.');
  }
  return schedulerInstance;
}