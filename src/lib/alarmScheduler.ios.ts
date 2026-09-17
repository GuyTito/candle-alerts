/**
 * alarmScheduler.ios.ts
 *
 * iOS stub implementation of the alarm scheduler.
 * Throws unsupported errors since iOS is not implemented yet.
 */

import { AlarmScheduler } from "./alarmSchedulerCore";
import { CandleAlert } from "./candleAlerts";

export const iosAlarmScheduler: AlarmScheduler = {
  async scheduleCandleAlerts(_alerts: CandleAlert[]): Promise<CandleAlert[]> {
    throw new Error("iOS alarm scheduling not implemented yet");
  },

  async openClockApp(): Promise<void> {
    throw new Error("iOS clock app opening not implemented yet");
  },
};
