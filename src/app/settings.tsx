import { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDefaults().then((d) => {
      setValues(toFields(d));
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    const problem = validateDefaults(values);
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
      });
      Alert.alert("Saved", "Defaults will be used on the main screen.");
    } catch {
      Alert.alert("Error", "Failed to save defaults");
    }
  };

  const handleReset = async () => {
    try {
      await resetDefaults();
      setValues(toFields(DEFAULT_VALUES));
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
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  buttonOutlineText: { color: "#208AEF" },
});
