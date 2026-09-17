# CandleAlerts

A React Native app built with Expo that schedules candle-close alarms on Android. Generate alert times based on candlestick chart intervals and set them as one-off alarms in the device Clock app via Android's AlarmClock API.

## Overview

CandleAlerts helps traders set a batch of one-off alarms for candle-forming times in technical analysis. Configure a candle interval (e.g., 15 minutes), a lead time before the candle forms (e.g., 2 minutes), and how many upcoming candles to track. The app generates alert times and schedules them in the device Clock app.

## Features

- **Generate candle alerts** — Compute upcoming candle-forming times based on interval, lead time, and count
- **Schedule Clock app alarms** — Create real one-off alarms via Android's AlarmClock API
- **Open Clock app** — Quickly access the device's clock app to review or cancel scheduled alarms
- **Same-day filter** — Optionally limit alerts to today only

## Tech Stack

- **Expo SDK 57** with React 19 and React Native 0.86
- **Expo Router** — File-based navigation
- **TypeScript** with strict mode
- **Custom native module** — Android native alarm scheduling via `NativeAlarmModule` (Kotlin)

## Project Structure

```
src/
  app/
    index.tsx          # Main screen — settings, alert generation, scheduling UI
    _layout.tsx        # Root layout (Stack navigator)
  lib/
    candleAlerts.ts    # Pure logic: compute candle-close alert times (platform-agnostic)
    alarmSchedulerCore.ts  # Platform-agnostic scheduler facade (setAlarmScheduler/getAlarmScheduler)
    alarmScheduler.android.ts  # Android impl — uses NativeAlarmModule (AlarmClock API)
    alarmScheduler.ios.ts    # iOS stub — throws unsupported (not yet implemented)
    withCandleAlertsNative.ts  # Expo config plugin — injects Kotlin native module + manifest entries
candle-alerts-resource/
  candleAlerts.js      # JS-only version of alert logic (for Node testing)
  alarmScheduler.js    # JS-only version of scheduler (for Node testing)
  App.js               # Standalone example screen
android/                 # Native Android project (generated/modified by config plugin)
assets/                  # App icons, splash screen, images
```

## Get Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Android device or emulator (iOS not currently supported)
- Expo Go (for development builds on device) or EAS Build (for production)

### Install

```bash
npm install
```

### Run

```bash
npx expo start
```

Then press:

- **a** — Open on Android emulator
- **i** — Open on iOS simulator
- **w** — Open in web browser
- **d** — Open Expo Developer Tools

### Build for Production

```bash
# Development build
npx eas build --profile development

# Preview (APK)
npx eas build --profile preview

# Production (AAB)
npx eas build --profile production
```

## Configuration

### app.json

Key settings in `app.json`:

| Field                      | Value                      | Description                                                         |
| -------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `expo.name`                | `CandleAlerts`             | App display name                                                    |
| `expo.scheme`              | `candlealerts`             | Deep link scheme                                                    |
| `expo.android.package`     | `com.guytito.CandleAlerts` | Android package ID                                                  |
| `expo.android.permissions` | none                       | The config plugin declares `com.android.alarm.permission.SET_ALARM` |
| `expo.plugins`             | `withCandleAlertsNative`   | Config plugin for native alarm module                               |

### Environment Variables

No environment variables required.

## Usage

1. Open the app and set your preferences:
   - **Interval (min)** — Candle size in minutes (e.g., 15, 30, 60)
   - **Lead (min)** — Minutes before the candle forms to alert (e.g., 2)
   - **Count** — How many upcoming alerts to generate
   - **Same day only** — Toggle to restrict alerts to today
2. Tap **Generate Alerts** to preview upcoming alert times
3. Tap **Set Alarms** to schedule them in your Android device's Clock app
4. Tap **Open Clock App** to review or cancel alarms in the clock app

## Architecture

### Alert Generation (`candleAlerts.ts`)

Pure TypeScript logic with no platform dependencies. Computes alert times by:

1. Finding the next candle boundary after the current time (based on interval)
2. Subtracting the lead time to get the alert time
3. Generating up to `count` alerts, optionally restricted to the same day

This module is fully testable in plain Node.js.

### Alarm Scheduling (`alarmSchedulerCore.ts` + `alarmScheduler.android.ts`)

A facade pattern decouples the UI from the platform implementation:

- `setAlarmScheduler()` / `getAlarmScheduler()` — Register/retrieve the platform implementation
- `scheduleCandleAlerts(alerts)` — Create the generated batch as Clock app alarms
- `openClockApp()` — Launch the clock app's alarm list

### Native Module (`withCandleAlertsNative.ts`)

An Expo config plugin that:

1. Injects Kotlin source files (`NativeAlarmModule.kt`, `NativeAlarmPackage.kt`) into the Android project
2. Adds the Clock alarm permission and intent visibility queries to `AndroidManifest.xml`
3. Adds `NativeAlarmPackage` to the React package list

The native module wraps `AlarmClock.ACTION_SET_ALARM` for silent alarm creation and `AlarmClock.ACTION_SHOW_ALARMS` to open the clock app. Android's intent API accepts only an hour and minute, so CandleAlerts rejects alerts outside today's local date rather than risking a wrong-day alarm.

### iOS

iOS alarm scheduling is not yet implemented. The iOS stub throws descriptive errors. The UI gracefully shows "iOS not supported yet" in the footer.

## Development Notes

- **Native code**: After modifying `withCandleAlertsNative.ts`, run `npx expo prebuild` or rebuild via EAS Build to regenerate native files
- **Testing alert logic**: Import `generateCandleAlerts` from `candle-alerts-resource/candleAlerts.js` in a plain Node script for server-side testing
- **No iOS support yet**: The iOS scheduler stub and UI footer communicate this clearly
- **Alarms are Clock-app-owned**: Once set, alarms belong to the clock app. This app cannot cancel or edit them; users should open the clock app to manage alarms.

## Learn More

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native](https://reactnative.dev/)
