import AsyncStorage from "@react-native-async-storage/async-storage";

import { Defaults, DEFAULT_VALUES, sanitizeDefaults } from "./defaults";

const STORAGE_KEY = "candlealerts.defaults.v1";

export async function loadDefaults(): Promise<Defaults> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? sanitizeDefaults(JSON.parse(json)) : DEFAULT_VALUES;
  } catch {
    return DEFAULT_VALUES;
  }
}

export async function saveDefaults(defaults: Defaults): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(sanitizeDefaults(defaults)),
  );
}

export async function resetDefaults(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
