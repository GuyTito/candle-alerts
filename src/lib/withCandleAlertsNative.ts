import { withMainApplication, withAndroidManifest, ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const NATIVE_ALARM_MODULE_KT = `package {packageName}

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Intent
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Calendar

class NativeAlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NativeAlarmModule"

    @ReactMethod
    fun setAlarm(hour: Int, minute: Int, message: String, skipUi: Boolean, promise: Promise) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(ReactApplicationContext.ALARM_SERVICE) as AlarmManager

            val intent = Intent(reactApplicationContext, AlarmReceiver::class.java).apply {
                putExtra(AlarmReceiver.EXTRA_MESSAGE, message)
                putExtra(AlarmReceiver.EXTRA_HOUR, hour)
                putExtra(AlarmReceiver.EXTRA_MINUTE, minute)
            }

            val requestCode = message.hashCode()
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val triggerTime = Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)

                if (timeInMillis <= System.currentTimeMillis()) {
                    add(Calendar.DAY_OF_YEAR, 1)
                }
            }.timeInMillis

            val alarmInfo = AlarmManager.AlarmClockInfo(triggerTime, pendingIntent)
            alarmManager.setAlarmClock(alarmInfo, pendingIntent)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_ALARM_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun showAlarms(promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SHOW_ALARMS).apply {
                addCategory(Intent.CATEGORY_DEFAULT)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHOW_ALARMS_FAILED", e.message, e)
        }
    }
}
`;

const NATIVE_ALARM_PACKAGE_KT = `package {packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NativeAlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(NativeAlarmModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

function getPackageName(config: any): string {
  if (config.android?.package) {
    return config.android.package;
  }
  const slug = config.slug || 'CandleAlerts';
  return `com.${slug.toLowerCase()}`;
}

const ALARM_RECEIVER_KT = `package {packageName}

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import {packageName}.MainActivity

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val message = intent.getStringExtra(EXTRA_MESSAGE) ?: "Candle alert"
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESCRIPTION
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 250, 500)
                setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    null
                )
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_MESSAGE, message)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            message.hashCode(),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Candle Alert")
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVibrate(longArrayOf(0, 500, 250, 500))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        notificationManager.notify(message.hashCode(), notification)
    }

    companion object {
        const val CHANNEL_ID = "candle_alarms"
        const val CHANNEL_NAME = "Candle Alarms"
        const val CHANNEL_DESCRIPTION = "Candle alert alarm notifications"
        const val EXTRA_MESSAGE = "extra_message"
        const val EXTRA_HOUR = "extra_hour"
        const val EXTRA_MINUTE = "extra_minute"
    }
}
`;

function writeKotlinFiles(projectRoot: string, packageName: string): void {
  const packagePath = packageName.replace(/\./g, path.sep);
  const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const moduleContent = NATIVE_ALARM_MODULE_KT.replace(/{packageName}/g, packageName);
  const packageContent = NATIVE_ALARM_PACKAGE_KT.replace(/{packageName}/g, packageName);
  const receiverContent = ALARM_RECEIVER_KT.replace(/{packageName}/g, packageName);

  fs.writeFileSync(path.join(targetDir, 'NativeAlarmModule.kt'), moduleContent);
  fs.writeFileSync(path.join(targetDir, 'NativeAlarmPackage.kt'), packageContent);
  fs.writeFileSync(path.join(targetDir, 'AlarmReceiver.kt'), receiverContent);
}

function addAlarmReceiverToManifest(manifest: any): void {
  const manifestXml = manifest.modResults.manifest;

  const permissionExists = manifestXml.usesPermission?.some(
    (p: any) => p.$?.['android:name'] === 'android.permission.POST_NOTIFICATIONS'
  );

  if (!permissionExists) {
    manifestXml.usesPermission = manifestXml.usesPermission || [];
    manifestXml.usesPermission.push({ $: { 'android:name': 'android.permission.POST_NOTIFICATIONS' } });
  }

  const application = manifestXml.application?.[0];
  if (application) {
    const receiverExists = application.receiver?.some(
      (r: any) => r.$?.['android:name'] === '.AlarmReceiver'
    );

    if (!receiverExists) {
      application.receiver = application.receiver || [];
      application.receiver.push({
        $: {
          'android:name': '.AlarmReceiver',
          'android:exported': 'false'
        }
      });
    }
  }
}

const withCandleAlertsNative: ConfigPlugin = (config) => {
  const packageName = getPackageName(config);

  config = withAndroidManifest(config, (config) => {
    addAlarmReceiverToManifest(config);
    return config;
  });

  return withMainApplication(config, (config) => {
    writeKotlinFiles(config.modRequest.projectRoot, packageName);

    const importPattern = new RegExp(`^package ${packageName.replace(/\./g, '\\.')};`, 'm');
    const importStatement = `import ${packageName}.NativeAlarmPackage;\n`;

    let contents = config.modResults.contents;

    if (!contents.includes('NativeAlarmPackage')) {
      contents = contents.replace(
        importPattern,
        (match) => `${match}\n${importStatement}`
      );
    }

    if (!contents.includes('NativeAlarmPackage()')) {
      const packageListPattern = /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(add\([^)]+\))?([\s\S]*?\})/m;
      const match = contents.match(packageListPattern);

      if (match) {
        const [fullMatch, before, existingAdd, after] = match;
        const addLine = '          add(NativeAlarmPackage())';
        if (existingAdd) {
          contents = contents.replace(fullMatch, `${before}${existingAdd}\n${addLine}${after}`);
        } else {
          contents = contents.replace(fullMatch, `${before}${addLine}\n        ${after}`);
        }
      } else {
        const packagesListPattern = /(override fun getPackages\(\): List<ReactPackage> = listOf\()([\s\S]*?)(\))/m;
        const match2 = contents.match(packagesListPattern);

        if (match2) {
          const [fullMatch, before, packages, after] = match2;
          const newPackages = packages.trim() ? `${packages.trim()},\n            NativeAlarmPackage()` : `NativeAlarmPackage()`;
          contents = contents.replace(fullMatch, `${before}${newPackages}\n        ${after}`);
        }
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};

export default withCandleAlertsNative;
