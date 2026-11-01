import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Href, Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { androidAlarmScheduler } from "@/lib/alarmScheduler.android";
import { iosAlarmScheduler } from "@/lib/alarmScheduler.ios";
import { getAlarmScheduler, setAlarmScheduler } from "@/lib/alarmSchedulerCore";
import { SettingsFieldValues, SettingsFields } from "@/components/SettingsFields";
import {
  CandleAlert,
  CandleAlertOptions,
  generateCandleAlerts,
} from "@/lib/candleAlerts";
import { DEFAULT_VALUES } from "@/lib/defaults";
import { loadDefaults } from "@/lib/defaultsStorage";

function initializeScheduler() {
  if (Platform.OS === "android") {
    setAlarmScheduler(androidAlarmScheduler);
  } else {
    setAlarmScheduler(iosAlarmScheduler);
  }
}

export default function Index() {
  initializeScheduler();

  const [fields, setFields] = useState<SettingsFieldValues>({
    intervalMinutes: String(DEFAULT_VALUES.intervalMinutes),
    leadMinutes: String(DEFAULT_VALUES.leadMinutes),
    count: String(DEFAULT_VALUES.count),
    sameDayOnly: DEFAULT_VALUES.sameDayOnly,
  });
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [generatedAlerts, setGeneratedAlerts] = useState<CandleAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload saved defaults whenever the screen gains focus (e.g. returning
  // from settings), replacing the current temporary edits.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadDefaults().then((d) => {
        if (!active) return;
        setFields({
          intervalMinutes: String(d.intervalMinutes),
          leadMinutes: String(d.leadMinutes),
          count: String(d.count),
          sameDayOnly: d.sameDayOnly,
        });
        setGeneratedAlerts([]);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleGenerate = () => {
    setError(null);
    try {
      if (startDate && startDate <= new Date()) {
        throw new Error("Start time must be in the future");
      }
      const opts: CandleAlertOptions = {
        intervalMinutes: Number(fields.intervalMinutes),
        leadMinutes: Number(fields.leadMinutes),
        count: Number(fields.count),
        sameDayOnly: fields.sameDayOnly,
        now: startDate ?? undefined,
      };
      const alerts = generateCandleAlerts(opts);
      setGeneratedAlerts(alerts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate alerts");
    }
  };

  // Time-only picker: use that time today, or tomorrow if already passed.
  const applyStartTime = (time: Date) => {
    const result = new Date();
    result.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (result <= new Date()) result.setDate(result.getDate() + 1);
    setStartDate(result);
    setGeneratedAlerts([]);
  };

  const handlePickStart = () => {
    const initial = startDate ?? new Date();
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initial,
        mode: "time",
        is24Hour: true,
        onChange: (_e, time) => {
          if (time) applyStartTime(time);
        },
      });
    } else {
      setShowIosPicker((v) => !v);
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
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInline]}>
              Settings
            </Text>
            <Link href={"/settings" as Href} style={styles.settingsLink}>
              Edit defaults
            </Link>
          </View>

          <SettingsFields
            values={fields}
            onChange={(patch) => {
              setFields((current) => ({ ...current, ...patch }));
              setGeneratedAlerts([]);
            }}
          />

          <Text style={styles.startLabel}>Start time</Text>
          <View style={styles.startRow}>
            <TouchableOpacity
              style={[styles.startInput, styles.startButton]}
              onPress={handlePickStart}
            >
              <Text style={styles.startButtonText}>
                {startDate ? formatDateTime(startDate) : "Now"}
              </Text>
            </TouchableOpacity>
            {startDate && (
              <TouchableOpacity
                accessibilityLabel="Reset start time to now"
                onPress={() => {
                  setStartDate(null);
                  setShowIosPicker(false);
                  setGeneratedAlerts([]);
                }}
              >
                <Text style={styles.settingsLink}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
          {Platform.OS === "ios" && showIosPicker && (
            <DateTimePicker
              value={startDate ?? new Date()}
              mode="time"
              onChange={(_e, d) => d && applyStartTime(d)}
            />
          )}
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
  startLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginTop: 16,
    marginBottom: 6,
  },
  startRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  startButton: {
    flex: 1,
  },
  startButtonText: {
    fontSize: 16,
    color: "#333",
  },
  startInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleInline: {
    marginBottom: 0,
  },
  settingsLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#208AEF",
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
