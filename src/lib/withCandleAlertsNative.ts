import { withMainApplication, ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const NATIVE_ALARM_MODULE_KT = `package {packageName}

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
                addCategory(Intent.CATEGORY_DEFAULT)
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
  // Try to get from Expo config android.package
  if (config.android?.package) {
    return config.android.package;
  }
  // Fallback: derive from slug
  const slug = config.slug || 'CandleAlerts';
  return `com.${slug.toLowerCase()}`;
}

function writeKotlinFiles(projectRoot: string, packageName: string): void {
  const packagePath = packageName.replace(/\./g, path.sep);
  const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', packagePath);
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const moduleContent = NATIVE_ALARM_MODULE_KT.replace(/{packageName}/g, packageName);
  const packageContent = NATIVE_ALARM_PACKAGE_KT.replace(/{packageName}/g, packageName);

  fs.writeFileSync(path.join(targetDir, 'NativeAlarmModule.kt'), moduleContent);
  fs.writeFileSync(path.join(targetDir, 'NativeAlarmPackage.kt'), packageContent);
}

const withCandleAlertsNative: ConfigPlugin = (config) => {
  // Get package name from Expo config
  const packageName = getPackageName(config);
  
  return withMainApplication(config, (config) => {
    // Write the Kotlin files
    writeKotlinFiles(config.modRequest.projectRoot, packageName);
    
    // Add import for NativeAlarmPackage
    const importPattern = new RegExp(`^package ${packageName.replace(/\./g, '\\.')};`, 'm');
    const importStatement = `import ${packageName}.NativeAlarmPackage;\n`;
    
    let contents = config.modResults.contents;
    
    // Add import after package declaration
    if (!contents.includes('NativeAlarmPackage')) {
      contents = contents.replace(
        importPattern,
        (match) => `${match}\n${importStatement}`
      );
    }
    
    // Add NativeAlarmPackage to the packages list
    // The new architecture uses PackageList, so we need to add to the list in reactHost
    if (!contents.includes('NativeAlarmPackage()')) {
      // Try to find the packages list in reactHost initialization
      // Pattern: PackageList(this).packages.apply { ... }
      const packageListPattern = /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(add\([^)]+\))?([\s\S]*?\})/m;
      const match = contents.match(packageListPattern);
      
      if (match) {
        const [fullMatch, before, existingAdd, after] = match;
        const addLine = '          add(NativeAlarmPackage())';
        if (existingAdd) {
          // Add after existing add
          contents = contents.replace(fullMatch, `${before}${existingAdd}\n${addLine}${after}`);
        } else {
          // Add before closing brace
          contents = contents.replace(fullMatch, `${before}${addLine}\n        ${after}`);
        }
      } else {
        // Fallback: try to find getPackages pattern (old architecture)
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