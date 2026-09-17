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
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            if (intent.resolveActivity(reactApplicationContext.packageManager) == null) {
                promise.reject("NO_CLOCK_APP", "No app on this device can handle ACTION_SET_ALARM")
                return
            }

            reactApplicationContext.startActivity(intent)
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
