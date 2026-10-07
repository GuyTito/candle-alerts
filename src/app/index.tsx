import { useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { androidAlarmScheduler } from "@/lib/alarmScheduler.android";
import { iosAlarmScheduler } from "@/lib/alarmScheduler.ios";
import { getAlarmScheduler, setAlarmScheduler } from "@/lib/alarmSchedulerCore";
import {
  CandleAlert,
  CandleAlertOptions,
  generateCandleAlerts,
} from "@/lib/candleAlerts";

function initializeScheduler() {
  if (Platform.OS === "android") {
    setAlarmScheduler(androidAlarmScheduler);
  } else {
    setAlarmScheduler(iosAlarmScheduler);
  }
}

export default function Index() {
  initializeScheduler();

  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [leadMinutes, setLeadMinutes] = useState(2);
  const [count, setCount] = useState("2");
  const [sameDayOnly, setSameDayOnly] = useState(false);
  const [generatedAlerts, setGeneratedAlerts] = useState<CandleAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    try {
      const opts: CandleAlertOptions = {
        intervalMinutes,
        leadMinutes,
        count: Number(count),
        sameDayOnly,
      };
      const alerts = generateCandleAlerts(opts);
      setGeneratedAlerts(alerts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate alerts");
    }
  };

  const handleSchedule = async () => {
    if (generatedAlerts.length === 0) {
      Alert.alert("No alerts", "Generate alerts first");
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setError(null);

    try {
      const scheduler = getAlarmScheduler();
      const scheduledCount = generatedAlerts.length;
      await scheduler.scheduleCandleAlerts(generatedAlerts);
      setGeneratedAlerts([]);
      // Deliberately not "N alarms scheduled": startActivity success means the
      // intent was dispatched, not that the clock app created the alarm. Only
      // the clock app can confirm that.
      Alert.alert(
        "Alarms dispatched",
        `Sent ${scheduledCount} alarm${
          scheduledCount === 1 ? "" : "s"
        } to the clock app.\n\nThe clock app owns them from here — tap "Open Clock App" to confirm they were all created.`,
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to schedule alarms";
      setError(message);
      Alert.alert("Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenClock = async () => {
    setError(null);
    try {
      const scheduler = getAlarmScheduler();
      await scheduler.openClockApp();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to open clock app";
      setError(message);
      Alert.alert("Error", message);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Candle Alerts</Text>
          <Text style={styles.subtitle}>Schedule candle-close alarms</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Interval (min)</Text>
              <TextInput
                style={styles.input}
                value={String(intervalMinutes)}
                onChangeText={(v) => {
                  setIntervalMinutes(Math.max(1, parseInt(v) || 1));
                  setGeneratedAlerts([]);
                }}
                keyboardType="numeric"
                placeholder="15"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Lead (min)</Text>
              <TextInput
                style={styles.input}
                value={String(leadMinutes)}
                onChangeText={(v) => {
                  setLeadMinutes(Math.max(0, parseInt(v) || 0));
                  setGeneratedAlerts([]);
                }}
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
                value={count}
                onChangeText={(v) => {
                  setCount(v);
                  setGeneratedAlerts([]);
                }}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Same day only</Text>
            <TouchableOpacity
              style={[
                styles.toggle,
                sameDayOnly ? styles.toggleOn : styles.toggleOff,
              ]}
              onPress={() => {
                setSameDayOnly(!sameDayOnly);
                setGeneratedAlerts([]);
              }}
            >
              <Text style={styles.toggleText}>
                {sameDayOnly ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonPrimary,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Generate Alerts</Text>
          </TouchableOpacity>

          {error && <Text style={styles.error}>{error}</Text>}

          {generatedAlerts.length > 0 && (
            <View style={styles.alertsContainer}>
              <View style={styles.alertsHeader}>
                <Text style={styles.alertsTitle}>
                  Generated Alerts ({generatedAlerts.length})
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Clear all generated alerts"
                  style={styles.alertActionButton}
                  onPress={() => {
                    setGeneratedAlerts([]);
                    setError(null);
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.alertAction}>Clear All</Text>
                </TouchableOpacity>
              </View>
              {generatedAlerts.map((alert, index) => (
                <View key={alert.alertTime.getTime()} style={styles.alertItem}>
                  <View style={styles.alertItemHeader}>
                    <Text style={styles.alertLabel}>{alert.label}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${alert.label}`}
                      style={styles.alertActionButton}
                      onPress={() => {
                        const alertTime = alert.alertTime.getTime();
                        setGeneratedAlerts((currentAlerts) =>
                          currentAlerts.filter(
                            (item) => item.alertTime.getTime() !== alertTime,
                          ),
                        );
                        setError(null);
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.alertAction}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.alertTimes}>
                    <Text style={styles.alertTime}>
                      Alert: {formatDateTime(alert.alertTime)}
                    </Text>
                    <Text style={styles.alertTime}>
                      Candle: {formatDateTime(alert.candleTime)}
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonSuccess,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleSchedule}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Scheduling..." : "Set Alarms"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={handleOpenClock}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.buttonOutlineText]}>
              Open Clock App
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Platform: {Platform.OS}
            {Platform.OS !== "android" && " (iOS not supported yet)"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 16,
  },
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
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 52,
  },
  buttonPrimary: {
    backgroundColor: "#208AEF",
  },
  buttonSuccess: {
    backgroundColor: "#10b981",
    marginTop: 12,
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#208AEF",
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  buttonOutlineText: {
    color: "#208AEF",
  },
  alertsContainer: {
    marginTop: 16,
  },
  alertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  alertItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  alertItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  alertLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  alertActionButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  alertAction: {
    color: "#b42318",
    fontSize: 14,
    fontWeight: "600",
  },
  alertTimes: {
    gap: 2,
  },
  alertTime: {
    fontFamily: "monospace",
  },
  error: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
