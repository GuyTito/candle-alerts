/**
 * alarmScheduler.ios.ts
 *
 * iOS stub implementation of the alarm scheduler.
 * Throws unsupported errors since iOS is not implemented yet.
 */

import { CandleAlert, CandleAlertOptions } from './candleAlerts';
import { AlarmScheduler } from './alarmSchedulerCore';

export const iosAlarmScheduler: AlarmScheduler = {
  async scheduleTodaysCandleAlerts(_opts: CandleAlertOptions): Promise<CandleAlert[]> {
    throw new Error('iOS alarm scheduling not implemented yet');
  },

  async openClockApp(): Promise<void> {
    throw new Error('iOS clock app opening not implemented yet');
  },
};