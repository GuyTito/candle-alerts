import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_VALUES, sanitizeDefaults, validateDefaults } from "./defaults";

describe("sanitizeDefaults", () => {
  it("returns built-ins for non-objects", () => {
    assert.deepEqual(sanitizeDefaults(null), DEFAULT_VALUES);
    assert.deepEqual(sanitizeDefaults("x"), DEFAULT_VALUES);
  });

  it("keeps valid values", () => {
    const v = { intervalMinutes: 60, leadMinutes: 0, count: 5, sameDayOnly: true, snoozeMinutes: 30 };
    assert.deepEqual(sanitizeDefaults(v), v);
  });

  it("falls back per field", () => {
    const r = sanitizeDefaults({
      intervalMinutes: 0,
      leadMinutes: -1,
      count: 1000,
      sameDayOnly: "yes",
      snoozeMinutes: 61,
    });
    assert.deepEqual(r, DEFAULT_VALUES);
    assert.equal(sanitizeDefaults({ intervalMinutes: 30 }).intervalMinutes, 30);
  });
});

describe("validateDefaults", () => {
  const ok = { intervalMinutes: "15", leadMinutes: "2", count: "2" };
  it("accepts valid input", () => {
    assert.equal(validateDefaults(ok), null);
  });
  it("rejects invalid fields", () => {
    assert.ok(validateDefaults({ ...ok, intervalMinutes: "0" }));
    assert.ok(validateDefaults({ ...ok, leadMinutes: "-1" }));
    assert.ok(validateDefaults({ ...ok, leadMinutes: "1.5" }));
    assert.ok(validateDefaults({ ...ok, count: "" }));
    assert.ok(validateDefaults({ ...ok, count: "97" }));
  });
  it("validates snooze only when provided", () => {
    assert.equal(validateDefaults({ ...ok, snoozeMinutes: "10" }), null);
    assert.ok(validateDefaults({ ...ok, snoozeMinutes: "0" }));
    assert.ok(validateDefaults({ ...ok, snoozeMinutes: "61" }));
    assert.ok(validateDefaults({ ...ok, snoozeMinutes: "" }));
  });
});
