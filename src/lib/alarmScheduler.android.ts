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

function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function calendarDayDistance(from: Date, to: Date): number {
  const fromDay = new Date(from);
  fromDay.setHours(0, 0, 0, 0);
  const toDay = new Date(to);
  toDay.setHours(0, 0, 0, 0);
  return Math.round(
    (toDay.getTime() - fromDay.getTime()) / (24 * 60 * 60 * 1000),
  );
}

export function validateClockAlarmDates(
  alerts: CandleAlert[],
  now: Date,
): void {
  for (const alert of alerts) {
    const daysAhead = calendarDayDistance(now, alert.alertTime);
    if (daysAhead !== 0) {
      throw new Error(
        `Clock app alarms support today's date only; ${calendarDayKey(alert.alertTime)} cannot be represented safely`,
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
