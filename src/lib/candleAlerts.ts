/**
 * candleAlerts.ts
 *
 * Pure logic for computing candle-close alert times.
 * No React Native imports here — keep this testable in plain Node.
 */

export interface CandleAlertOptions {
  intervalMinutes: number;
  leadMinutes: number;
  count: number;
  now?: Date;
  sameDayOnly?: boolean;
}

export interface CandleAlert {
  candleTime: Date;
  alertTime: Date;
  label: string;
}

/**
 * Generate the next N candle-forming alert timestamps.
 *
 * @param opts - Options for generating candle alerts
 * @returns Array of candle alerts with candleTime, alertTime, and label
 */
export function generateCandleAlerts(opts: CandleAlertOptions): CandleAlert[] {
  const {
    intervalMinutes,
    leadMinutes,
    count,
    now = new Date(),
    sameDayOnly = true,
  } = opts;

  if (intervalMinutes <= 0) throw new Error('intervalMinutes must be > 0');
  if (leadMinutes < 0) throw new Error('leadMinutes must be >= 0');
  if (leadMinutes >= intervalMinutes) {
    throw new Error('leadMinutes must be smaller than intervalMinutes');
  }

  const results: CandleAlert[] = [];
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Find the next candle boundary strictly after "now".
  const msSinceMidnight = now.getTime() - startOfDay.getTime();
  const intervalMs = intervalMinutes * 60 * 1000;
  const leadMs = leadMinutes * 60 * 1000;

  let nextBoundaryIndex = Math.floor(msSinceMidnight / intervalMs) + 1;

  while (results.length < count) {
    const candleTime = new Date(startOfDay.getTime() + nextBoundaryIndex * intervalMs);

    if (sameDayOnly && candleTime.getDate() !== now.getDate()) {
      break; // ran off the end of today
    }

    const alertTime = new Date(candleTime.getTime() - leadMs);

    // Only include alerts that haven't already passed
    if (alertTime > now) {
      results.push({
        candleTime,
        alertTime,
        label: buildLabel(intervalMinutes, leadMinutes, candleTime),
      });
    }

    nextBoundaryIndex += 1;
  }

  return results;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatHHMM(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildLabel(intervalMinutes: number, leadMinutes: number, candleTime: Date): string {
  return `${intervalMinutes}min candle forming in ${leadMinutes}min (${formatHHMM(candleTime)})`;
}

export { formatHHMM };