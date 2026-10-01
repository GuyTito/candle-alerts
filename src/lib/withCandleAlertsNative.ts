import {
  ConfigPlugin,
  withAndroidManifest,
  withMainApplication,
} from "@expo/config-plugins";
import * as fs from "fs";
import * as path from "path";

const NATIVE_ALARM_MODULE_KT = `package {packageName}

import android.content.Intent
import android.provider.AlarmClock
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeAlarmModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "NativeAlarmModule"

    @ReactMethod
    fun setAlarm(hour: Int, minute: Int, message: String, skipUi: Boolean, promise: Promise) {
        try {
            val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
                putExtra(AlarmClock.EXTRA_HOUR, hour)
                putExtra(AlarmClock.EXTRA_MINUTES, minute)
                putExtra(AlarmClock.EXTRA_MESSAGE, message)
                putExtra(AlarmClock.EXTRA_SKIP_UI, skipUi)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION
            }

            if (intent.resolveActivity(reactApplicationContext.packageManager) == null) {
                promise.reject("NO_CLOCK_APP", "No app on this device can handle ACTION_SET_ALARM")
                return
            }

            reactApplicationContext.startActivity(intent)

            // Each ACTION_SET_ALARM launch targets the clock app's
            // HandleSetApiCalls activity. startActivity() returns as soon as the
            // launch is queued, so firing a batch back-to-back collapses them in
            // ActivityTaskManager and the middle alarms are silently dropped --
            // startActivity still returns success. Measured on AOSP Deskclock:
            // 4 burst intents -> 2 alarms created, 4 intents paced 2s apart ->
            // 4 alarms created. Wait here so each launch is consumed before the
            // next one is dispatched.
            try {
                Thread.sleep(SET_ALARM_SPACING_MS)
            } catch (ie: InterruptedException) {
                Thread.currentThread().interrupt()
                promise.reject("SET_ALARM_INTERRUPTED", "Alarm scheduling was interrupted", ie)
                return
            }

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

    companion object {
        /**
         * Delay between consecutive ACTION_SET_ALARM launches.
         *
         * Measured on AOSP Deskclock by dispatching real batches:
         *   - no delay     ->  2 of  4 created (middle launches dropped)
         *   - 1200ms       -> 15 of 16 created
         *   - 2000ms       ->  7 of  8 created  (one drop; still too tight)
         *   - ~2200ms      ->  8 of  8 created  (adb am-start overhead on top
         *                                    of a 2s sleep, so ~2.3s effective)
         *
         * 3000ms is set to keep real margin over the ~2.2s that measured clean.
         * This is a race against a third-party activity, not a hard threshold, so
         * occasional drops remain possible -- re-run a batch if an alarm is
         * missing rather than assuming success. ACTION_SET_ALARM gives no way to
         * confirm creation from the caller.
         *
         * This scales the wall-clock cost of a batch: N alerts take roughly
         * N * 3000ms, and the UI shows "Scheduling..." throughout. A 96-alert
         * batch would take about five minutes.
         */
        private const val SET_ALARM_SPACING_MS = 3000L
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
  const slug = config.slug || "CandleAlerts";
  return `com.${slug.toLowerCase()}`;
}

function writeKotlinFiles(projectRoot: string, packageName: string): void {
  const packagePath = packageName.replace(/\./g, path.sep);
  const targetDir = path.join(
    projectRoot,
    "android",
    "app",
    "src",
    "main",
    "java",
    packagePath,
  );

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const moduleContent = NATIVE_ALARM_MODULE_KT.replace(
    /{packageName}/g,
    packageName,
  );
  const packageContent = NATIVE_ALARM_PACKAGE_KT.replace(
    /{packageName}/g,
    packageName,
  );

  fs.writeFileSync(path.join(targetDir, "NativeAlarmModule.kt"), moduleContent);
  fs.writeFileSync(
    path.join(targetDir, "NativeAlarmPackage.kt"),
    packageContent,
  );
  fs.rmSync(path.join(targetDir, "AlarmReceiver.kt"), { force: true });
}

function addClockIntentQueries(manifest: any): void {
  const manifestXml = manifest.modResults.manifest;
  const permissionName = "com.android.alarm.permission.SET_ALARM";
  const permissions = manifestXml["uses-permission"] || [];
  if (
    !permissions.some(
      (permission: any) => permission.$?.["android:name"] === permissionName,
    )
  ) {
    permissions.push({ $: { "android:name": permissionName } });
  }
  manifestXml["uses-permission"] = permissions;

  const queries = manifestXml.queries || [];
  const queryActions = new Set(
    queries.flatMap((query: any) =>
      (query.intent || []).flatMap((intent: any) =>
        (intent.action || []).map((action: any) => action.$?.["android:name"]),
      ),
    ),
  );
  const actions = [
    "android.intent.action.SET_ALARM",
    "android.intent.action.SHOW_ALARMS",
  ];

  const query = queries[0] || { intent: [] };
  query.intent = query.intent || [];
  for (const action of actions) {
    if (!queryActions.has(action)) {
      query.intent.push({ action: [{ $: { "android:name": action } }] });
    }
  }
  manifestXml.queries = queries.length > 0 ? queries : [query];
}

const withCandleAlertsNative: ConfigPlugin = (config) => {
  const packageName = getPackageName(config);

  config = withAndroidManifest(config, (config) => {
    addClockIntentQueries(config);
    return config;
  });

  return withMainApplication(config, (config) => {
    writeKotlinFiles(config.modRequest.projectRoot, packageName);

    const importPattern = new RegExp(
      `^package ${packageName.replace(/\./g, "\\.")};`,
      "m",
    );
    const importStatement = `import ${packageName}.NativeAlarmPackage;\n`;

    let contents = config.modResults.contents;

    if (!contents.includes("NativeAlarmPackage")) {
      contents = contents.replace(
        importPattern,
        (match) => `${match}\n${importStatement}`,
      );
    }

    if (!contents.includes("NativeAlarmPackage()")) {
      const packageListPattern =
        /(PackageList\(this\)\.packages\.apply\s*\{[\s\S]*?)(add\([^)]+\))?([\s\S]*?\})/m;
      const match = contents.match(packageListPattern);

      if (match) {
        const [fullMatch, before, existingAdd, after] = match;
        const addLine = "          add(NativeAlarmPackage())";
        if (existingAdd) {
          contents = contents.replace(
            fullMatch,
            `${before}${existingAdd}\n${addLine}${after}`,
          );
        } else {
          contents = contents.replace(
            fullMatch,
            `${before}${addLine}\n        ${after}`,
          );
        }
      } else {
        const packagesListPattern =
          /(override fun getPackages\(\): List<ReactPackage> = listOf\()([\s\S]*?)(\))/m;
        const match2 = contents.match(packagesListPattern);

        if (match2) {
          const [fullMatch, before, packages, after] = match2;
          const newPackages = packages.trim()
            ? `${packages.trim()},\n            NativeAlarmPackage()`
            : `NativeAlarmPackage()`;
          contents = contents.replace(
            fullMatch,
            `${before}${newPackages}\n        ${after}`,
          );
        }
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};

export default withCandleAlertsNative;
