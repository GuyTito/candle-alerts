import { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AlarmMode, APP_MODE_AVAILABLE, DEFAULT_ALARM_MODE } from "@/lib/alarmMode";
import { loadAlarmMode, saveAlarmMode } from "@/lib/alarmModeStorage";

import { SettingsFieldValues, SettingsFields } from "@/components/SettingsFields";
import { DEFAULT_VALUES, Defaults, validateDefaults } from "@/lib/defaults";
import { loadDefaults, resetDefaults, saveDefaults } from "@/lib/defaultsStorage";

const toFields = (d: Defaults): SettingsFieldValues => ({
  intervalMinutes: String(d.intervalMinutes),
  leadMinutes: String(d.leadMinutes),
  count: String(d.count),
  sameDayOnly: d.sameDayOnly,
});

export default function Settings() {
  const [values, setValues] = useState<SettingsFieldValues>(
    toFields(DEFAULT_VALUES),
  );
  const [snooze, setSnooze] = useState(String(DEFAULT_VALUES.snoozeMinutes));
  const [mode, setMode] = useState<AlarmMode>(DEFAULT_ALARM_MODE);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadDefaults(), loadAlarmMode()]).then(([d, m]) => {
      setValues(toFields(d));
      setSnooze(String(d.snoozeMinutes));
      setMode(m);
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    const problem = validateDefaults({ ...values, snoozeMinutes: snooze });
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      await saveDefaults({
        intervalMinutes: Number(values.intervalMinutes),
        leadMinutes: Number(values.leadMinutes),
        count: Number(values.count),
        sameDayOnly: values.sameDayOnly,
        snoozeMinutes: Number(snooze),
      });
      await saveAlarmMode(mode);
      Alert.alert("Saved", "Defaults will be used on the main screen.");
    } catch {
      Alert.alert("Error", "Failed to save defaults");
    }
  };

  const handleReset = async () => {
    try {
      await resetDefaults();
      await saveAlarmMode(DEFAULT_ALARM_MODE);
      setValues(toFields(DEFAULT_VALUES));
      setSnooze(String(DEFAULT_VALUES.snoozeMinutes));
      setMode(DEFAULT_ALARM_MODE);
      setError(null);
    } catch {
      Alert.alert("Error", "Failed to reset defaults");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          These values pre-fill the main screen each time it opens.
        </Text>
        <SettingsFields
          values={values}
          onChange={(patch) => {
            setValues((v) => ({ ...v, ...patch }));
            setError(null);
          }}
        />

        <Text style={styles.sectionTitle}>Snooze (min)</Text>
        <TextInput
          style={styles.input}
          value={snooze}
          onChangeText={(v) => {
            setSnooze(v);
            setError(null);
          }}
          keyboardType="numeric"
          placeholder="10"
        />
        <Text style={styles.modeText}>
          Used by CandleAlerts alarms only. In Clock app mode, snooze is set in
          the Clock app.
        </Text>

        {Platform.OS === "android" && (
          <View style={styles.modeSection}>
            <Text style={styles.sectionTitle}>Alarm mode</Text>
            <TouchableOpacity
              style={[styles.modeCard, mode === "clock" && styles.modeCardOn]}
              onPress={() => setMode("clock")}
            >
              <Text style={styles.modeTitle}>Clock app</Text>
              <Text style={styles.modeText}>
                Alarms are created in your Clock app, which rings and manages
                them. Takes about 3 seconds per alarm and the app must stay
                open.
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeCard,
                mode === "app" && styles.modeCardOn,
                !APP_MODE_AVAILABLE && styles.disabled,
              ]}
              onPress={() => setMode("app")}
              disabled={!APP_MODE_AVAILABLE}
            >
              <Text style={styles.modeTitle}>
                CandleAlerts{!APP_MODE_AVAILABLE && " (coming soon)"}
              </Text>
              <Text style={styles.modeText}>
                Alarms are owned by this app: set instantly in the background,
                ring like a clock alarm, and can be cancelled here. They will
                not appear in the Clock app.
              </Text>
            </TouchableOpacity>
            <Text style={styles.modeText}>
              Switching modes does not move alarms that already exist.
            </Text>
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, !loaded && styles.disabled]}
            onPress={handleSave}
            disabled={!loaded}
          >
            <Text style={styles.buttonText}>Save Defaults</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={handleReset}
          >
            <Text style={[styles.buttonText, styles.buttonOutlineText]}>
              Reset to Built-in Defaults
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 20 },
  description: { fontSize: 14, color: "#666", marginBottom: 20 },
  error: { color: "#ef4444", fontSize: 14, marginTop: 12, textAlign: "center" },
  buttons: { marginTop: 24, gap: 12 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 52,
  },
  buttonPrimary: { backgroundColor: "#208AEF" },
  buttonOutline: {
    borderWidth: 2,
    borderColor: "#208AEF",
  },
  disabled: { opacity: 0.6 },
  sectionTitle: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 6,
  },
  modeSection: { marginTop: 16, gap: 8 },
  modeCard: { borderWidth: 2, borderColor: "#ddd", borderRadius: 12, padding: 12 },
  modeCardOn: { borderColor: "#208AEF" },
  modeTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  modeText: { fontSize: 13, color: "#666" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  buttonOutlineText: { color: "#208AEF" },
});
