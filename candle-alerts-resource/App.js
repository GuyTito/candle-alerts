/**
 * App.js - minimal example screen
 *
 * Shows: generate today's alert times, confirm, then create each as a
 * real system alarm via the native AlarmClock intent module.
 */

import React, { useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet } from 'react-native';
import { generateCandleAlerts, formatHHMM } from './candleAlerts';
import { scheduleTodaysCandleAlerts, openClockApp } from './alarmScheduler';

const INTERVAL_MINUTES = 15;
const LEAD_MINUTES = 2;
const COUNT = 5;

export default function App() {
  const [preview, setPreview] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | scheduling | done | error

  function handlePreview() {
    const alerts = generateCandleAlerts({
      intervalMinutes: INTERVAL_MINUTES,
      leadMinutes: LEAD_MINUTES,
      count: COUNT,
    });
    setPreview(alerts);
    setStatus('idle');
  }

  async function handleConfirm() {
    setStatus('scheduling');
    try {
      await scheduleTodaysCandleAlerts({
        intervalMinutes: INTERVAL_MINUTES,
        leadMinutes: LEAD_MINUTES,
        count: COUNT,
      });
      setStatus('done');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Candle Alerts</Text>

      <Button title="Generate Today's Alerts" onPress={handlePreview} />

      <FlatList
        data={preview}
        keyExtractor={(item) => item.candleTime.toISOString()}
        renderItem={({ item }) => (
          <Text style={styles.row}>
            {formatHHMM(item.alertTime)} -> {item.label}
          </Text>
        )}
        style={styles.list}
      />

      {preview.length > 0 && (
        <Button
          title={
            status === 'scheduling'
              ? 'Setting alarms...'
              : status === 'done'
              ? 'Alarms set'
              : status === 'error'
              ? 'Failed - tap to retry'
              : 'Confirm & Set Alarms'
          }
          onPress={handleConfirm}
          disabled={status === 'scheduling' || status === 'done'}
        />
      )}

      {status === 'done' && (
        <>
          <Text style={styles.note}>
            Each alarm was created in your device's clock app. This app
            cannot cancel or edit them for you (Android doesn't allow that
            for privacy reasons) - open the clock app below to review or
            delete any of them manually.
          </Text>
          <Button title="Open Clock App" onPress={openClockApp} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  list: { marginVertical: 16 },
  row: { fontSize: 16, paddingVertical: 6 },
  note: { fontSize: 13, color: '#555', marginVertical: 12 },
});
