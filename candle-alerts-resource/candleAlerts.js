/**
 * candleAlerts.js
 *
 * Pure logic for computing candle-close alert times.
 * No React Native imports here — keep this testable in plain Node.
 */

/**
 * Generate the next N candle-forming alert timestamps.
 *
 * @param {Object} opts
 * @param {number} opts.intervalMinutes - candle size, e.g. 15
 * @param {number} opts.leadMinutes - how many minutes before candle forms to alert, e.g. 2
 * @param {number} opts.count - how many upcoming candles to generate alerts for
 * @param {Date}   [opts.now] - override "current time" (mainly for testing)
 * @param {boolean} [opts.sameDayOnly] - if true, stop generating once the candle would form on the next day
 * @returns {Array<{candleTime: Date, alertTime: Date, label: string}>}
 */
function generateCandleAlerts({
  intervalMinutes,
  leadMinutes,
  count,
  now = new Date(),
  sameDayOnly = true,
}) {
  if (intervalMinutes <= 0) throw new Error("intervalMinutes must be > 0");
  if (leadMinutes < 0) throw new Error("leadMinutes must be >= 0");
  if (!Number.isInteger(count) || count <= 0 || count > 96) {
    throw new Error("count must be an integer between 1 and 96");
  }
  if (leadMinutes >= intervalMinutes) {
    throw new Error("leadMinutes must be smaller than intervalMinutes");
  }

  const results = [];
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Find the next candle boundary strictly after "now".
  const msSinceMidnight = now - startOfDay;
  const intervalMs = intervalMinutes * 60 * 1000;
  const leadMs = leadMinutes * 60 * 1000;

  let nextBoundaryIndex = Math.floor(msSinceMidnight / intervalMs) + 1;

  while (results.length < count) {
    const candleTime = new Date(
      startOfDay.getTime() + nextBoundaryIndex * intervalMs,
    );

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

function pad(n) {
  return n.toString().padStart(2, "0");
}

function formatHHMM(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildLabel(intervalMinutes, leadMinutes, candleTime) {
  return `${intervalMinutes}min candle forming in ${leadMinutes}min (${formatHHMM(candleTime)})`;
}

module.exports = { generateCandleAlerts, formatHHMM };
