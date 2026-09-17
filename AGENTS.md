# CandleAlerts — Agent Guidelines

## Expo SDK Version

This project uses **Expo SDK 57**. Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Project Overview

CandleAlerts is an Expo + React Native app that schedules candle-close alarms on Android. It computes alert times from configurable intervals/lead times and creates them in the device Clock app through a custom native module wrapping Android's AlarmClock intent API.

## Key Files

| File                                | Purpose                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `src/app/index.tsx`                 | Main screen UI — settings, generation, scheduling                   |
| `src/lib/candleAlerts.ts`           | Pure alert time computation (platform-agnostic, testable in Node)   |
| `src/lib/alarmSchedulerCore.ts`     | Scheduler facade — set/get the platform implementation              |
| `src/lib/alarmScheduler.android.ts` | Android scheduler — uses `NativeAlarmModule` from native code       |
| `src/lib/alarmScheduler.ios.ts`     | iOS stub — throws unsupported                                       |
| `src/lib/withCandleAlertsNative.ts` | Expo config plugin — injects and registers the Kotlin native module |
| `app.json`                          | App config including plugins, permissions, scheme                   |
| `candle-alerts-resource/`           | Plain JS versions for Node.js testing                               |

## Architecture Patterns

- **Pure logic separation**: `candleAlerts.ts` has zero React Native imports — importable in plain Node for testing
- **Facade pattern**: `alarmSchedulerCore.ts` decouples UI from platform via `setAlarmScheduler()` / `getAlarmScheduler()`
- **Config plugin**: `withCandleAlertsNative.ts` generates Kotlin source and registers the native package at build time
- **Platform detection**: In `index.tsx`, `initializeScheduler()` sets the correct scheduler based on `Platform.OS`

## Important Notes

- **iOS not supported**: `alarmScheduler.ios.ts` throws errors. The UI shows a footer noting this.
- **Native module requires prebuild**: After editing the config plugin, run `npx expo prebuild` or use EAS Build.
- **Alarms are OS-owned**: The app cannot cancel/modify alarms after setting them. Users manage them in the clock app.
- **Clock-app alarms**: The device Clock app owns these alarms; this app cannot cancel or edit them through the intent API.

## Adding New Features

1. Pure logic changes → edit `src/lib/candleAlerts.ts` (also update `candle-alerts-resource/candleAlerts.js` if needed for Node testing)
2. UI changes → edit `src/app/index.tsx`
3. Scheduling behavior changes → edit both `alarmSchedulerCore.ts` (interface) and `alarmScheduler.android.ts` (implementation)
4. Native Android changes → edit `src/lib/withCandleAlertsNative.ts` (config plugin) and the Kotlin templates within it
5. iOS support → implement `alarmScheduler.ios.ts` with a real scheduler

## Testing

- **Alert logic**: Import from `candle-alerts-resource/candleAlerts.js` in a Node script (no React Native needed)
- **Lint**: `npm run lint`
- **Type-check**: `npx tsc --noEmit`
