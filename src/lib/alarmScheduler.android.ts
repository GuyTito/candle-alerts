/**
 * alarmScheduler.android.ts
 *
 * Android implementation of the alarm scheduler using NativeAlarmModule.
 */

import { NativeModules } from "react-native";
import { AlarmScheduler } from "./alarmSchedulerCore";
import { CandleAlert } from "./candleAlerts";

interface NativeAlarmModuleInterface {
  setAlarm(
    hour: number,
    minute: number,
    message: string,
    skipUi: boolean,
  ): Promise<boolean>;
  showAlarms(): Promise<boolean>;
}

function getNativeModule(): NativeAlarmModuleInterface {
  const nativeModule = NativeModules.NativeAlarmModule as
    | NativeAlarmModuleInterface
    | undefined;
  if (!nativeModule) {
    throw new Error(
      "NativeAlarmModule not found. Build the Android app with the CandleAlerts config plugin.",
    );
  }
  return nativeModule;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The intent carries only hour:minute, so Clock sets the next occurrence of it.
// That matches the intended time for any alert in the future within 24 hours,
// including ones that cross midnight.
export function validateClockAlarmDates(
  alerts: CandleAlert[],
  now: Date,
): void {
  for (const alert of alerts) {
    const msAhead = alert.alertTime.getTime() - now.getTime();
    if (msAhead <= 0 || msAhead >= DAY_MS) {
      throw new Error(
        `Clock app alarms must be within the next 24 hours; ${alert.alertTime.toString()} cannot be represented safely`,
      );
    }
  }
}

export const androidAlarmScheduler: AlarmScheduler = {
  async scheduleCandleAlerts(alerts: CandleAlert[]): Promise<CandleAlert[]> {
    validateClockAlarmDates(alerts, new Date());
    const nativeModule = getNativeModule();

    for (const alert of alerts) {
      // The native module paces these internally — see SET_ALARM_SPACING_MS in
      // withCandleAlertsNative.ts. Do not add a JS-side delay here as well.
      await nativeModule.setAlarm(
        alert.alertTime.getHours(),
        alert.alertTime.getMinutes(),
        alert.label,
        true, // skipUi — create silently, no confirmation screen
      );
    }

    return alerts;
  },

  async openClockApp(): Promise<void> {
    await getNativeModule().showAlarms();
  },
};
