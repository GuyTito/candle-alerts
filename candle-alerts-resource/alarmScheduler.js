/**
 * alarmScheduler.js
 *
 * Uses a small custom native module (NativeAlarmModule, see
 * android-native/NativeAlarmModule.kt) that wraps Android's built-in
 * AlarmClock intent API (android.provider.AlarmClock, ACTION_SET_ALARM).
 *
 * This is NOT a third-party npm alarm package. It hands alarm creation
 * off to whichever clock app is installed (Google Clock, Samsung Clock,
 * etc.), so it behaves exactly like manually setting an alarm:
 *  - Rings on the alarm audio stream (bypasses silent/DND)
 *  - Survives app being closed/killed and device reboot
 *    (the clock app owns the alarm, not your app's process)
 *  - Shows the alarm-clock icon in the status bar
 *  - No abandoned-dependency risk — it's an OS API, not a library
 *
 * Trade-off: each call briefly hands off to the clock app. With
 * EXTRA_SKIP_UI=true this happens without showing a confirmation
 * screen, but on some OEM clock apps you may see a brief flash.
 */

import { NativeModules } from 'react-native';
import { generateCandleAlerts } from './candleAlerts';

const { NativeAlarmModule } = NativeModules;

/**
 * Generates today's candle alerts and creates each as a real system alarm.
 *
 * @param {Object} opts - same shape as generateCandleAlerts opts
 * @returns {Promise<Array>} the generated alerts (for UI preview/confirmation)
 */
export async function scheduleTodaysCandleAlerts(opts) {
  const alerts = generateCandleAlerts(opts);

  for (const alert of alerts) {
    await NativeAlarmModule.setAlarm(
      alert.alertTime.getHours(),
      alert.alertTime.getMinutes(),
      alert.label,
      true // skipUi — create silently, no confirmation screen
    );
  }

  return alerts;
}

/**
 * Opens the clock app's alarm list so the user can verify/manage alarms.
 * There is no reliable cross-OEM way to cancel alarms created via this
 * intent API (Android doesn't expose that for privacy/security reasons),
 * so if you need to clear old candle alarms, surface this so the user
 * can delete them manually, or dedupe by only scheduling times that
 * haven't passed yet (already handled in candleAlerts.js).
 */
export function openClockApp() {
  return NativeAlarmModule.showAlarms();
}
