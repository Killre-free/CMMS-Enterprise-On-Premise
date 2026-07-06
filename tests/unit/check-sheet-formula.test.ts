import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { evaluateCalculatedFields } from "@/lib/check-sheet-formula";
import type { CheckSheetField } from "@prisma/client";

function field(overrides: Partial<CheckSheetField>): CheckSheetField {
  return {
    id: "f1",
    templateId: "t1",
    key: "field",
    type: "Text",
    label: "Field",
    required: false,
    order: 0,
    config: null,
    ...overrides,
  } as CheckSheetField;
}

describe("evaluateCalculatedFields", () => {
  it("leaves non-Calculated fields untouched", () => {
    const fields = [field({ key: "temperature", type: "Number", order: 0 })];
    const result = evaluateCalculatedFields(fields, { temperature: 42 });
    assert.equal(result.temperature, 42);
  });

  it("evaluates a formula referencing an earlier submitted value", () => {
    const fields = [
      field({ key: "celsius", type: "Number", order: 0 }),
      field({
        key: "fahrenheit",
        type: "Calculated",
        order: 1,
        config: { formula: "celsius * 9 / 5 + 32" },
      }),
    ];
    const result = evaluateCalculatedFields(fields, { celsius: 20 });
    assert.equal(result.fahrenheit, 68);
  });

  it("evaluates calculated fields in ascending `order`, even if the array is unsorted", () => {
    const fields = [
      field({ key: "c", type: "Calculated", order: 2, config: { formula: "a + b" } }),
      field({ key: "b", type: "Calculated", order: 1, config: { formula: "a * 2" } }),
      field({ key: "a", type: "Number", order: 0 }),
    ];
    const result = evaluateCalculatedFields(fields, { a: 5 });
    assert.equal(result.b, 10);
    assert.equal(result.c, 15);
  });

  it("sets the field to null when the formula throws (e.g. missing variable)", () => {
    const fields = [
      field({ key: "bad", type: "Calculated", order: 0, config: { formula: "undefinedVar + 1" } }),
    ];
    const result = evaluateCalculatedFields(fields, {});
    assert.equal(result.bad, null);
  });

  it("leaves a Calculated field with no formula configured untouched", () => {
    const fields = [field({ key: "x", type: "Calculated", order: 0, config: {} })];
    const result = evaluateCalculatedFields(fields, { x: "original" });
    assert.equal(result.x, "original");
  });

  it("does not mutate the input values object", () => {
    const values = { a: 1 };
    const fields = [field({ key: "b", type: "Calculated", order: 0, config: { formula: "a + 1" } })];
    evaluateCalculatedFields(fields, values);
    assert.deepEqual(values, { a: 1 });
  });
});
