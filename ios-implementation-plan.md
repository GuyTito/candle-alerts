# iOS implementation plan (deferred)

Status: **not started**. Android has two modes (Clock app, App-owned). iOS currently uses the stub in `src/lib/alarmScheduler.ios.ts`, which throws "not implemented".

## Goal

Let iOS users generate candle alerts and schedule them in bulk, instantly, without keeping the app in the foreground, and have them ring as close to a real alarm as iOS allows.

## Constraints

- iOS has **no public API to create alarms in the Clock app**, so Clock mode is Android-only. On iOS, App mode is the only mode (hide the mode picker).
- Only two real options exist:
  | Option | Ringing | Requirements |
  |---|---|---|
  | **AlarmKit** | Real system alarm: rings like Clock, breaks through silent and Focus, shows on the lock screen | iOS 26+, Swift native module, user alarm authorization |
  | **Local notifications** (`UNUserNotificationCenter`) | Notification sound only, capped at about 30 s, no looping or full-screen UI, respects silent switch and Focus unless Time Sensitive | Any supported iOS, `expo-notifications` |
- Local notifications are limited to **64 pending** per app. The max alert count here is 96, so the notification path must cap or chunk batches.

> The AlarmKit API surface was not verified when this plan was written. Before Phase 2, read Apple's current AlarmKit docs and the Expo docs for SDK 57 (https://docs.expo.dev/versions/v57.0.0/) and adjust.

## Strategy

AlarmKit on iOS 26+, local notifications as fallback on older versions, both behind the existing `AlarmScheduler` facade so the UI changes little.

## Phases

### Phase 1: Notification baseline (works everywhere)

1. Add `expo-notifications` (`npx expo install expo-notifications`) and its config plugin entry in `app.json`.
2. Create `src/lib/notificationAlarmScheduler.ts` implementing `AlarmScheduler`:
   - `capabilities: { background: true, manageAlarms: true }`.
   - `ensurePermissions()`: request notification permission, return a `PermissionResult` with an "Open settings" action if denied (`Linking.openSettings()`).
   - `scheduleCandleAlerts()`: schedule date-triggered notifications with the alert label, a bundled sound (the iOS limit is under 30 s), and the Time Sensitive interruption level.
   - Reject or warn when the batch would exceed 64 pending notifications (existing pending count plus the new alerts).
   - `listPending()`, `cancel(id)`, `cancelAll()` from the scheduled-notification APIs.
3. Snooze: add a notification category with Snooze and Dismiss actions. A background response handler re-schedules the notification using `snoozeMinutes` from `loadDefaults()`.
4. Set the platform branch in `initializeScheduler()` in `src/app/index.tsx` to use it on iOS.
5. Tests: keep pure logic (batch cap, trigger-date computation) in a Node-testable module under `src/lib/` and add it to the `test` script in `package.json`.

### Phase 2: AlarmKit (iOS 26+)

1. Write a Swift Expo module (see the `expo-module` skill and the Expo Modules API docs). Config plugin changes go in a new `src/lib/withCandleAlertsIOS.ts`, following the Android plugin pattern (Swift templates read from files with `fs`, not relative TS imports).
2. Add the required Info.plist usage description for alarm authorization and any entitlements AlarmKit needs.
3. Native API to expose: request authorization, schedule alarm (absolute date, label, snooze duration), list, cancel, cancel all.
4. Create `src/lib/alarmKitScheduler.ts` with the same `AlarmScheduler` shape. Resolve at runtime: use AlarmKit when the OS is 26+ and authorized, otherwise the notification scheduler.
5. Show the user which engine is active in settings ("Real alarms" or "Notifications only") and why.

### Phase 3: UI and settings

- Hide the "Alarm mode" picker on iOS; keep the snooze field (used by both iOS engines).
- Reliability section on iOS: explain Focus/Do Not Disturb and silent-switch behavior for the notification fallback, with a link to Settings.
- Remove the "iOS not supported yet" footer text in `src/app/index.tsx` and the iOS limitation notes in `AGENTS.md`.
- Ensure the scheduled-alarms list and Cancel/Cancel All work against the iOS schedulers.

### Phase 4: Verification (needs a Mac and a physical iPhone)

- `npx expo prebuild --platform ios`, then build and run on a device. Simulators cannot validate sound, Focus or lock-screen behavior.
- Run: `npm test`, `npm run lint`, `npx tsc --noEmit`.
- Manual checks, for both engines where applicable:
  - Bulk schedule (including the near-cap case) completes instantly with the app backgrounded.
  - Alarm fires with the app closed and the screen locked.
  - Silent switch and Focus behavior (AlarmKit should break through; notifications should not unless Time Sensitive and allowed).
  - Snooze uses the configured minutes; Dismiss stops it.
  - Cancel and Cancel All remove alarms; reboot persistence.
  - Permission denial paths show the settings prompt, not a crash.
- Write a `test-instructions.md` section for iOS following the Android one.

## Risks and open questions

- AlarmKit availability and details may change; iOS 26 adoption determines how many users get real alarms.
- 64-notification cap: decide between a hard cap with a clear message or rolling scheduling (re-arm the rest when the app opens), which only partly works without background execution.
- Notification sound length cap (about 30 s) means a missed first sound will not repeat; consider scheduling a few follow-up notifications a minute apart as a "repeat" substitute (counts against the 64 cap).
- App Store review: alarm/notification usage descriptions must be accurate.
- Requires an Apple developer account for device builds (`eas build` or local signing).

## Files expected to change or be added

- New: `src/lib/notificationAlarmScheduler.ts`, `src/lib/alarmKitScheduler.ts`, `src/lib/withCandleAlertsIOS.ts`, Swift templates under `src/lib/native-templates/`, iOS section in `test-instructions.md`.
- Changed: `src/lib/alarmScheduler.ios.ts` (replace the stub or remove it), `src/app/index.tsx`, `src/app/settings.tsx`, `app.json`, `package.json`, `AGENTS.md`.
