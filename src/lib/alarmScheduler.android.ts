/**
 * alarmScheduler.android.ts
 *
 * Android implementation of the alarm scheduler using NativeAlarmModule.
 */

import { NativeModules } from 'react-native';
import { CandleAlert, CandleAlertOptions, generateCandleAlerts } from './candleAlerts';
import { AlarmScheduler } from './alarmSchedulerCore';

const { NativeAlarmModule } = NativeModules;

if (!NativeAlarmModule) {
  throw new Error(
    'NativeAlarmModule not found. Ensure the config plugin (withCandleAlertsNative) is added to app.json and you have run `npx expo prebuild` or are building with EAS Build.'
  );
}

interface NativeAlarmModuleInterface {
  setAlarm(hour: number, minute: number, message: string, skipUi: boolean): Promise<boolean>;
  showAlarms(): Promise<boolean>;
}

const nativeModule = NativeAlarmModule as NativeAlarmModuleInterface;

export const androidAlarmScheduler: AlarmScheduler = {
  async scheduleTodaysCandleAlerts(opts: CandleAlertOptions): Promise<CandleAlert[]> {
    const alerts = generateCandleAlerts(opts);

    for (const alert of alerts) {
      await nativeModule.setAlarm(
        alert.alertTime.getHours(),
        alert.alertTime.getMinutes(),
        alert.label,
        true // skipUi — create silently, no confirmation screen
      );
    }

    return alerts;
  },

  async openClockApp(): Promise<void> {
    await nativeModule.showAlarms();
  },
};