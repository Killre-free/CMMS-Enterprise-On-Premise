import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeNextDue } from "@/lib/pm-schedule";

describe("computeNextDue", () => {
  const from = new Date("2026-01-15T00:00:00.000Z");

  it("adds 1 day for Daily", () => {
    const result = computeNextDue("Daily", undefined, from);
    assert.equal(result?.toISOString(), "2026-01-16T00:00:00.000Z");
  });

  it("adds 7 days for Weekly", () => {
    const result = computeNextDue("Weekly", undefined, from);
    assert.equal(result?.toISOString(), "2026-01-22T00:00:00.000Z");
  });

  it("adds 1 month for Monthly", () => {
    const result = computeNextDue("Monthly", undefined, from);
    assert.equal(result?.toISOString(), "2026-02-15T00:00:00.000Z");
  });

  it("adds 3 months for Quarterly", () => {
    const result = computeNextDue("Quarterly", undefined, from);
    assert.equal(result?.toISOString(), "2026-04-15T00:00:00.000Z");
  });

  it("adds 1 year for Yearly", () => {
    const result = computeNextDue("Yearly", undefined, from);
    assert.equal(result?.toISOString(), "2027-01-15T00:00:00.000Z");
  });

  it("returns null for RunningHour (triggered by machine running hours, not a calendar date)", () => {
    assert.equal(computeNextDue("RunningHour", 500, from), null);
  });

  it("rolls over into the next month when the day doesn't exist in the target month (Jan 31 -> Mar 3)", () => {
    const jan31 = new Date("2026-01-31T00:00:00.000Z");
    const result = computeNextDue("Monthly", undefined, jan31);
    // JS Date normalizes Feb 31 -> Mar 3 (2026 is not a leap year)
    assert.equal(result?.toISOString(), "2026-03-03T00:00:00.000Z");
  });

  it("does not mutate the input date", () => {
    const original = new Date(from);
    computeNextDue("Daily", undefined, from);
    assert.equal(from.toISOString(), original.toISOString());
  });
});
