import AsyncStorage from "@react-native-async-storage/async-storage";

import { AlarmMode, DEFAULT_ALARM_MODE, sanitizeAlarmMode } from "./alarmMode";

const STORAGE_KEY = "candlealerts.alarmMode.v1";

export async function loadAlarmMode(): Promise<AlarmMode> {
  try {
    return sanitizeAlarmMode(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_ALARM_MODE;
  }
}

export async function saveAlarmMode(mode: AlarmMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, sanitizeAlarmMode(mode));
}
