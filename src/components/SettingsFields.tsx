import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export interface SettingsFieldValues {
  intervalMinutes: string;
  leadMinutes: string;
  count: string;
  sameDayOnly: boolean;
}

interface Props {
  values: SettingsFieldValues;
  onChange: (patch: Partial<SettingsFieldValues>) => void;
}

export function SettingsFields({ values, onChange }: Props) {
  return (
    <>
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interval (min)</Text>
          <TextInput
            style={styles.input}
            value={values.intervalMinutes}
            onChangeText={(v) => onChange({ intervalMinutes: v })}
            keyboardType="numeric"
            placeholder="15"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lead (min)</Text>
          <TextInput
            style={styles.input}
            value={values.leadMinutes}
            onChangeText={(v) => onChange({ leadMinutes: v })}
            keyboardType="numeric"
            placeholder="2"
          />
        </View>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Count</Text>
          <TextInput
            style={styles.input}
            value={values.count}
            onChangeText={(v) => onChange({ count: v })}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Same day only</Text>
        <TouchableOpacity
          style={[
            styles.toggle,
            values.sameDayOnly ? styles.toggleOn : styles.toggleOff,
          ]}
          onPress={() => onChange({ sameDayOnly: !values.sameDayOnly })}
        >
          <Text style={styles.toggleText}>
            {values.sameDayOnly ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 16,
    color: "#333",
  },
  toggle: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  toggleOn: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  toggleOff: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
