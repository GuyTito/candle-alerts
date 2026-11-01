import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_ALARM_MODE, sanitizeAlarmMode } from "./alarmMode";

describe("sanitizeAlarmMode", () => {
  it("falls back to the default for unknown values", () => {
    assert.equal(sanitizeAlarmMode(null), DEFAULT_ALARM_MODE);
    assert.equal(sanitizeAlarmMode("bogus"), DEFAULT_ALARM_MODE);
  });

  it("defaults to app", () => {
    assert.equal(DEFAULT_ALARM_MODE, "app");
  });

  it("keeps clock", () => {
    assert.equal(sanitizeAlarmMode("clock"), "clock");
  });

  it("keeps app", () => {
    assert.equal(sanitizeAlarmMode("app"), "app");
  });
});
