# Test instructions: two alarm modes (Clock vs App-owned)

Audience: an AI agent verifying the "two alarm modes" feature in CandleAlerts.
Report every step as PASS / FAIL / BLOCKED with evidence (command output, logcat lines, screenshots). Do not modify source code; if something fails, report it.

## Feature under test

- **Clock mode**: alarms are created in the stock Clock app via `ACTION_SET_ALARM`. Foreground-bound, about 3 s per alarm.
- **App mode** (`CandleAlerts` in settings; now the default): alarms are registered with `AlarmManager.setAlarmClock`, rung by the app's own foreground service (`AlarmRingService`) and lock-screen activity (`AlarmRingActivity`). Instant, works in the background, cancellable in-app.
- **Snooze setting**: `snoozeMinutes` (1–60, default 10), used by App mode only.

Key files: `src/lib/appAlarmScheduler.ts`, `src/lib/withCandleAlertsNative.ts`, `src/lib/native-templates/*.kt.txt`, `src/lib/alarmMode*.ts`, `src/lib/defaults.ts`, `src/app/settings.tsx`, `src/app/index.tsx`.

## Environment

- Repo: `/Users/kofiquist/dev/CandleAlerts`
- `adb`: `~/Library/Android/sdk/platform-tools/adb` (add to PATH)
- Emulator: `~/Library/Android/sdk/emulator/emulator`; AVDs available: `Medium_Phone_API_36.1`, `Pixel`. A real device is preferred for audio/vibration checks, but an emulator is acceptable for everything else.
- Android package: `com.guytito.CandleAlerts`
- iOS is out of scope (stub only).

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

## Phase 1: Static checks (no device)

Run from the repo root. All must pass.

```bash
npm test                 # expect: 15 pass, 0 fail
npx tsc --noEmit         # expect: no output
npm run lint             # expect: no errors
```

Also confirm by reading the code:
1. `sanitizeDefaults` in `src/lib/defaults.ts` accepts `snoozeMinutes` 1–60 and falls back to 10 otherwise.
2. `sanitizeAlarmMode("app")` returns `"app"`; any other unknown value returns `"clock"`.

## Phase 2: Native build verification

```bash
npx expo prebuild --platform android --no-install --clean
ls android/app/src/main/java/com/guytito/CandleAlerts/
```

Expect these files: `AlarmReceiver.kt AlarmRingActivity.kt AlarmRingService.kt AlarmScheduling.kt AlarmStore.kt BootReceiver.kt MainActivity.kt MainApplication.kt NativeAlarmModule.kt NativeAlarmPackage.kt`.

```bash
grep -n "Alarm\|BootReceiver\|SCHEDULE_EXACT\|FULL_SCREEN\|FOREGROUND_SERVICE\|RECEIVE_BOOT\|POST_NOTIFICATIONS" android/app/src/main/AndroidManifest.xml
```

Expect permissions `SCHEDULE_EXACT_ALARM`, `USE_FULL_SCREEN_INTENT`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`, `VIBRATE`, plus the service (`foregroundServiceType="mediaPlayback"`), two receivers, and the activity.

```bash
cd android && ./gradlew :app:compileDebugKotlin --offline -q
```

Expect exit code 0 (deprecation notes are fine).

## Phase 3: Install and run

```bash
adb devices                                  # one device/emulator must be listed
# if none: emulator -avd Medium_Phone_API_36.1 -no-snapshot &  (wait for boot)
npx expo run:android                         # builds and installs the dev build
```

If `expo run:android` can't launch Metro interactively, start `npx expo start --dev-client` in a separate shell and open the app on the device. Use a Google Play-less AOSP image only if its Clock app handles `SET_ALARM`; Clock-mode tests need a working Clock app.

Useful commands during testing:

```bash
adb logcat -c
adb logcat -s AlarmManager:* ActivityManager:* AndroidRuntime:E ReactNativeJS:* | head -200
adb shell dumpsys alarm | grep -A3 com.guytito.CandleAlerts      # pending alarms of the app
adb shell dumpsys alarm | grep -i "next alarm\|nextAlarmClock"   # system "next alarm"
adb shell am force-stop com.guytito.CandleAlerts
adb shell pm clear com.guytito.CandleAlerts                      # reset all state
```

## Phase 4: Settings screen

Open the app → "Edit defaults".

| # | Step | Expected |
|---|---|---|
| 4.1 | Open settings | Snooze field shows `10`; "Alarm mode" cards show **CandleAlerts** selected by default; an "Alarm reliability" section lists missing full-screen / battery-optimization permissions (tapping opens the matching system settings; the entries disappear after granting and returning). |
| 4.2 | Set Snooze to `0`, Save | Inline error about snooze between 1 and 60; nothing saved. |
| 4.3 | Set Snooze to `61`, Save | Same error. |
| 4.4 | Set Snooze to `abc` / empty, Save | Same error. |
| 4.5 | Set Snooze to `2`, select CandleAlerts, Save | "Saved" alert. |
| 4.6 | Force-stop and reopen the app, open settings | Snooze `2` and CandleAlerts mode persisted. |
| 4.7 | Tap "Reset to Built-in Defaults" | Snooze `10`, mode back to CandleAlerts (the default). |

## Phase 5: Clock mode regression (default behavior must be unchanged)

Precondition: select Clock app and Save.

| # | Step | Expected |
|---|---|---|
| 5.1 | Main screen: Interval 15, Lead 2, Count 2, Generate Alerts | 2 generated alerts listed. |
| 5.2 | Observe below the "Set Alarms" button | Hint "Keep the app open while alarms are being set." is visible. |
| 5.3 | Tap Set Alarms | Button shows "Scheduling..." for about 6 s; then "Alarms dispatched" dialog. |
| 5.4 | Observe the bottom of the screen | "Open Clock App" button visible; no "Scheduled Alarms" list. |
| 5.5 | Tap Open Clock App | Stock Clock app opens and shows the 2 new alarms with candle labels. |

## Phase 6: App mode: permissions flow

Set mode = CandleAlerts and Save. Start from a clean state: `adb shell pm clear com.guytito.CandleAlerts`, reopen the app, set the mode again.

| # | Step | Expected |
|---|---|---|
| 6.1 | On Android 13+, Generate, then Set Alarms | System notification-permission prompt appears. |
| 6.2 | Deny it | Alert "Permission needed" about notifications; nothing scheduled (`dumpsys alarm` shows none for the app). |
| 6.3 | Retry, allow notifications | Continues. |
| 6.4 | If exact-alarm permission is off (`adb shell appops get com.guytito.CandleAlerts SCHEDULE_EXACT_ALARM`) | Alert with "Open settings" opening the "Alarms & reminders" screen for the app. Enable it, retry. On emulators where it is already granted, mark BLOCKED. |
| 6.5 | With both granted, Set Alarms | Alert "Alarms set"; "Scheduled Alarms (N)" list appears; the "keep app open" hint and the "Open Clock App" button are not shown. |

To force the exact-alarm denial path:
`adb shell appops set com.guytito.CandleAlerts SCHEDULE_EXACT_ALARM deny` (restore with `allow`).

## Phase 7: App mode: scheduling and background behavior

Use Interval 1, Lead 0, Count 3 (or equivalent) so the alarms fall within a few minutes. Confirm times in the generated list.

| # | Step | Expected |
|---|---|---|
| 7.1 | Tap Set Alarms | Completes in well under 1 s (no multi-second "Scheduling..."). |
| 7.2 | `adb shell dumpsys alarm \| grep -A3 com.guytito.CandleAlerts` | Entries for the 3 alarms of type RTC_WAKEUP/alarm-clock. |
| 7.3 | Immediately press Home and open another app (e.g. Settings) | Nothing in the flow required the app to stay open. |
| 7.4 | Return to the app | "Scheduled Alarms" list shows the 3 alarms sorted by time with correct labels and times. |
| 7.5 | Wait for the first alarm time (stay in another app) | Alarm rings (looping sound), device vibrates, a heads-up notification with **Snooze** and **Dismiss** appears (or the full-screen alarm UI if the screen is locked). Verify the sound with `adb shell dumpsys audio \| grep -i "usage=USAGE_ALARM"` or `adb shell dumpsys media.audio_flinger`, or observe it physically. |
| 7.6 | Tap Dismiss | Sound and vibration stop; notification gone; that alarm disappears from the list on refocus. |
| 7.7 | Let the next alarm ring and tap Snooze (snooze set to 1 for the test) | Sound stops; a new alarm appears about 1 min later (check `dumpsys alarm` and the list) and rings again. |
| 7.8 | Let an alarm ring and do nothing | Auto-stops after about 5 minutes (optional; mark SKIPPED if too long). |

## Phase 8: Lock screen and system behavior

| # | Step | Expected |
|---|---|---|
| 8.1 | Schedule an alarm about 1 min out, lock the screen (`adb shell input keyevent 26`) | At the alarm time the screen turns on and `AlarmRingActivity` shows the label with Snooze/Dismiss over the lock screen. (On Android 14+ this needs full-screen-intent permission; otherwise only a notification appears, which is expected, not a failure.) |
| 8.2 | Set the phone to silent/vibrate, schedule an alarm | Alarm still rings (alarm stream). |
| 8.3 | Enable Do Not Disturb (default config) | Alarm still rings (alarms are allowed by default). |
| 8.4 | Doze: `adb shell dumpsys deviceidle force-idle`, wait for an alarm | Alarm still fires (setAlarmClock is Doze-exempt). Restore with `adb shell dumpsys deviceidle unforce`. |
| 8.5 | Check the status bar and next alarm | Alarm icon shows; `dumpsys alarm` lists the next alarm clock. |

## Phase 9: Persistence and management

| # | Step | Expected |
|---|---|---|
| 9.1 | Schedule 3 alarms 10+ min out. In the list tap Cancel on one | It disappears; `dumpsys alarm` no longer lists it; it never rings. |
| 9.2 | Tap Cancel All | List empties; no alarms remain in `dumpsys alarm` for the app. |
| 9.3 | Reboot test: schedule 2 alarms 10+ min out, then `adb reboot`, wait for boot **without opening the app** | After boot, `dumpsys alarm` again lists the app's alarms (BootReceiver re-registered them). Alarms whose time passed during the reboot are dropped, not fired late. |
| 9.4 | Force-stop the app (`adb shell am force-stop ...`), reopen | Pending list still shows the persisted alarms. Note: force-stop cancels AlarmManager registrations on Android; if they are missing from `dumpsys alarm` until the next boot or app open, report this as an observation, not necessarily a bug. |
| 9.5 | Past times: generate alerts whose time is already past (start time in the past is blocked by the UI; if impossible, skip) | Not applicable via the UI; mark SKIPPED if unreachable. |
| 9.6 | Mode switching | Switch to Clock mode: the "Scheduled Alarms" list is hidden and Open Clock App is shown. App-mode alarms already scheduled still ring. Switch back: the list is visible again. |

## Phase 10: Edge cases

- Count = 96 in App mode: batch schedules instantly and all 96 appear in the list.
- Alerts crossing midnight in App mode: scheduled with absolute timestamps, so the 24-hour limit does not apply; confirm times in the list.
- Deny notifications permanently in system settings, then try App mode: expect the "Permission needed" alert and no crash.
- Rotate the device while an alarm rings: no crash, the sound continues.

## Reporting

Produce a table: Step ID | Result (PASS/FAIL/BLOCKED/SKIPPED) | Evidence. For every FAIL include the relevant `adb logcat` excerpt (filter `AndroidRuntime:E` for crashes) and the exact reproduction steps. End with a summary of blockers (e.g., no physical device for audio/vibration) and any behavior you consider suspicious even if it did not fail an explicit expectation.

## Cleanup

```bash
adb shell appops set com.guytito.CandleAlerts SCHEDULE_EXACT_ALARM allow
adb shell dumpsys deviceidle unforce
adb shell pm clear com.guytito.CandleAlerts
```

Do not commit `android/` (git-ignored) or any other generated files.
