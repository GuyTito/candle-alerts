package com.candlealerts

import android.app.Activity
import android.content.Intent
import android.provider.AlarmClock
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * NativeAlarmModule
 *
 * Thin wrapper around Android's built-in AlarmClock intent API
 * (android.provider.AlarmClock, action SET_ALARM).
 *
 * This hands the alarm creation off to whichever clock app is installed
 * on the device (Google Clock, Samsung Clock, etc.) — it IS a real
 * system alarm, not a notification. No third-party alarm library,
 * no custom AlarmManager/BroadcastReceiver plumbing, no risk of an
 * abandoned dependency breaking on a future Android version.
 *
 * EXTRA_SKIP_UI = true means no confirmation screen is shown; the
 * alarm is created silently in the background.
 */
class NativeAlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NativeAlarmModule"

    /**
     * Creates a single system alarm.
     *
     * @param hour 0-23
     * @param minute 0-59
     * @param message label shown in the clock app (e.g. "15min candle forming in 2min (9:45)")
     * @param skipUi if true, alarm is created without showing the clock app's UI
     */
    @ReactMethod
    fun setAlarm(hour: Int, minute: Int, message: String, skipUi: Boolean, promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi)
                // Do NOT set EXTRA_DAYS -> one-off (non-repeating) alarm
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            val resolvedActivity = intent.resolveActivity(reactApplicationContext.packageManager)
            if (resolvedActivity == null) {
                promise.reject(
                    "NO_CLOCK_APP",
                    "No app on this device can handle ACTION_SET_ALARM. Is a clock app installed?"
                )
                return
            }

            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_ALARM_FAILED", e.message, e)
        }
    }

    /**
     * Opens the clock app's alarm list (useful to let the user verify
     * everything got created correctly).
     */
    @ReactMethod
    fun showAlarms(promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SHOW_ALARMS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHOW_ALARMS_FAILED", e.message, e)
        }
    }
}
