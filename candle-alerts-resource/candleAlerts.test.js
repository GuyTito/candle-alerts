const assert = require("node:assert/strict");
const test = require("node:test");

const { generateCandleAlerts } = require("./candleAlerts.js");

test("generates the next boundaries after now", () => {
  const now = new Date(2026, 8, 17, 12, 7, 0, 0);
  const alerts = generateCandleAlerts({
    intervalMinutes: 15,
    leadMinutes: 2,
    count: 2,
    now,
  });

  assert.deepEqual(
    alerts.map(({ candleTime, alertTime }) => [
      candleTime.getHours(),
      candleTime.getMinutes(),
      alertTime.getHours(),
      alertTime.getMinutes(),
    ]),
    [
      [12, 15, 12, 13],
      [12, 30, 12, 28],
    ],
  );
});

test("stops at the end of the local day when sameDayOnly is enabled", () => {
  const now = new Date(2026, 8, 17, 23, 50, 0, 0);
  const alerts = generateCandleAlerts({
    intervalMinutes: 15,
    leadMinutes: 2,
    count: 2,
    now,
    sameDayOnly: true,
  });

  assert.equal(alerts.length, 0);
});

test("allows the next day when sameDayOnly is disabled", () => {
  const now = new Date(2026, 8, 17, 23, 50, 0, 0);
  const alerts = generateCandleAlerts({
    intervalMinutes: 15,
    leadMinutes: 2,
    count: 2,
    now,
    sameDayOnly: false,
  });

  assert.equal(alerts[0].candleTime.getDate(), 18);
  assert.equal(alerts[1].candleTime.getDate(), 18);
});

test("rejects invalid alert options", () => {
  const now = new Date(2026, 8, 17, 12, 0, 0, 0);

  assert.throws(
    () =>
      generateCandleAlerts({
        intervalMinutes: 15,
        leadMinutes: 15,
        count: 1,
        now,
      }),
    /leadMinutes must be smaller/,
  );
  assert.throws(
    () =>
      generateCandleAlerts({
        intervalMinutes: 15,
        leadMinutes: 2,
        count: 0,
        now,
      }),
    /count must be/,
  );
  assert.throws(
    () =>
      generateCandleAlerts({
        intervalMinutes: 15,
        leadMinutes: 2,
        count: 97,
        now,
      }),
    /count must be/,
  );
});
