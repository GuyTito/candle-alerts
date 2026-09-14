# Candle Alerts — Native Module Setup

No npm alarm package is used. This app talks to Android's built-in
Clock app directly via the `AlarmClock.ACTION_SET_ALARM` intent — the
same API that "Add alarm" buttons in other apps use. That means:

- It IS a real system alarm (same reliability as one you set by hand)
- No dependency on unmaintained/archived third-party packages
- One real limitation: Android does not allow apps to cancel or edit
  alarms they created this way. If you re-run "Generate Today's Alerts"
  and confirm again, you'll get duplicate alarms unless you manually
  delete old ones in the clock app first. The `openClockApp()` helper
  is there for exactly that.

## Files

- `candleAlerts.js` — pure interval math (unchanged, already tested)
- `alarmScheduler.js` — calls the native module for each generated alert
- `App.js` — example screen
- `android-native/NativeAlarmModule.kt` — the native module itself
- `android-native/NativeAlarmPackage.kt` — registers it with React Native

## Wiring the native module into your Android project

1. Create your RN project if you haven't:
   ```
   npx react-native init CandleAlerts
   ```

2. Copy the Kotlin files into your project, matching the package name.
   Default target path (adjust `com.candlealerts` to your actual
   `applicationId` if different):
   ```
   android/app/src/main/java/com/candlealerts/NativeAlarmModule.kt
   android/app/src/main/java/com/candlealerts/NativeAlarmPackage.kt
   ```

3. Register the package in `MainApplication.kt` (or `.java`):
   ```kotlin
   override fun getPackages(): List<ReactPackage> =
       PackageList(this).packages.apply {
           add(NativeAlarmPackage())
       }
   ```

4. No manifest permissions are required for `ACTION_SET_ALARM` —
   it's a standard implicit intent, not a protected API.

5. Copy `candleAlerts.js`, `alarmScheduler.js`, and `App.js` into your
   project root (replacing the default `App.js`).

6. Rebuild:
   ```
   npx react-native run-android
   ```

## Testing

Tap "Generate Today's Alerts" to preview, then "Confirm & Set Alarms".
Each alert should silently create an alarm in your device's default
clock app (check with the "Open Clock App" button after). If nothing
happens, check `adb logcat` for `SET_ALARM_FAILED` or `NO_CLOCK_APP`
errors — the latter means no app on the device handles the intent,
which is rare but possible on some stripped-down ROMs.
