/**
 * appAlarmScheduler.ts
 *
 * Android scheduler for app-owned alarms: registered with
 * AlarmManager.setAlarmClock and rung by the app's own foreground service, so a
 * whole batch is created instantly and no foreground UI is needed.
 */

import { NativeModules, PermissionsAndroid, Platform } from "react-native";
import {
  AlarmScheduler,
  PendingAlarm,
  PermissionResult,
} from "./alarmSchedulerCore";
import { CandleAlert } from "./candleAlerts";
import { loadDefaults } from "./defaultsStorage";

interface NativeAppAlarmModule {
  scheduleBatch(alerts: { timeMs: number; label: string }[]): Promise<number>;
  listPending(): Promise<{ id: number; timeMs: number; label: string }[]>;
  cancelAlarm(id: number): Promise<boolean>;
  cancelAllAlarms(): Promise<boolean>;
  setSnoozeMinutes(minutes: number): Promise<boolean>;
  canScheduleExactAlarms(): Promise<boolean>;
  openExactAlarmSettings(): Promise<boolean>;
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<boolean>;
  isIgnoringBatteryOptimizations(): Promise<boolean>;
  openBatteryOptimizationSettings(): Promise<boolean>;
}

export interface ReliabilityStatus {
  fullScreenIntent: boolean;
  batteryUnrestricted: boolean;
}

export async function getReliabilityStatus(): Promise<ReliabilityStatus> {
  const nativeModule = getNativeModule();
  const [fullScreenIntent, batteryUnrestricted] = await Promise.all([
    nativeModule.canUseFullScreenIntent(),
    nativeModule.isIgnoringBatteryOptimizations(),
  ]);
  return { fullScreenIntent, batteryUnrestricted };
}

export async function openFullScreenIntentSettings(): Promise<void> {
  await getNativeModule().openFullScreenIntentSettings();
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  await getNativeModule().openBatteryOptimizationSettings();
}

function getNativeModule(): NativeAppAlarmModule {
  const nativeModule = NativeModules.NativeAlarmModule as
    | NativeAppAlarmModule
    | undefined;
  if (!nativeModule || typeof nativeModule.scheduleBatch !== "function") {
    throw new Error(
      "App alarms are not available. Rebuild the Android app with the CandleAlerts config plugin.",
    );
  }
  return nativeModule;
}

export const appAlarmScheduler: AlarmScheduler = {
  capabilities: { background: true, manageAlarms: true },

  async ensurePermissions(): Promise<PermissionResult> {
    const nativeModule = getNativeModule();

    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return {
          ok: false,
          message:
            "Notification permission is required so alarms can ring and show on the lock screen.",
        };
      }
    }

    if (!(await nativeModule.canScheduleExactAlarms())) {
      return {
        ok: false,
        message:
          "Allow \"Alarms & reminders\" for CandleAlerts so alarms fire at the exact time.",
        openSettings: async () => {
          await nativeModule.openExactAlarmSettings();
        },
      };
    }

    return { ok: true };
  },

  async scheduleCandleAlerts(alerts: CandleAlert[]): Promise<CandleAlert[]> {
    const nativeModule = getNativeModule();
    const { snoozeMinutes } = await loadDefaults();
    await nativeModule.setSnoozeMinutes(snoozeMinutes);

    const count = await nativeModule.scheduleBatch(
      alerts.map((a) => ({ timeMs: a.alertTime.getTime(), label: a.label })),
    );
    if (count !== alerts.length) {
      throw new Error(
        `Only ${count} of ${alerts.length} alarms were scheduled; the rest were in the past`,
      );
    }
    return alerts;
  },

  async listPending(): Promise<PendingAlarm[]> {
    const items = await getNativeModule().listPending();
    return items.map((i) => ({
      id: i.id,
      time: new Date(i.timeMs),
      label: i.label,
    }));
  },

  async cancel(id: number): Promise<void> {
    await getNativeModule().cancelAlarm(id);
  },

  async cancelAll(): Promise<void> {
    await getNativeModule().cancelAllAlarms();
  },

  async openClockApp(): Promise<void> {
    throw new Error("App alarms are managed inside CandleAlerts");
  },
};
