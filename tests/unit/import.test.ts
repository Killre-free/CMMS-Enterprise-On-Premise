import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { processImportRows, summarize } from "@/lib/import";

const rowSchema = z.object({
  code: z.string().min(1, "code is required"),
});

describe("processImportRows", () => {
  it("reports a per-row validation error without aborting the rest of the batch", async () => {
    const results = await processImportRows(
      [{ code: "A" }, { code: "" }, { code: "B" }],
      rowSchema,
      async (row) => ({ id: `id-${row.code}` })
    );

    assert.equal(results.length, 3);
    assert.equal(results[0].success, true);
    assert.equal(results[0].id, "id-A");
    assert.equal(results[1].success, false);
    assert.ok(results[1].errors?.[0].message.includes("code is required"));
    assert.equal(results[2].success, true);
  });

  it("numbers rows starting at 2 to match the spreadsheet line (row 1 is the header)", async () => {
    const results = await processImportRows([{ code: "A" }], rowSchema, async (row) => ({
      id: row.code,
    }));
    assert.equal(results[0].row, 2);
  });

  it("captures a createRow failure (e.g. a duplicate key) as a row-level error", async () => {
    const results = await processImportRows([{ code: "DUP" }], rowSchema, async () => {
      const err = new Error("Unique constraint failed") as Error & { code: string };
      err.code = "P2002";
      throw err;
    });
    assert.equal(results[0].success, false);
    assert.ok(results[0].errors?.[0].message.includes("Duplicate value"));
  });
});

describe("summarize", () => {
  it("counts successes and failures", () => {
    const { summary } = summarize([
      { row: 2, success: true, id: "1" },
      { row: 3, success: false, errors: [{ path: "", message: "bad" }] },
      { row: 4, success: true, id: "2" },
    ]);
    assert.deepEqual(summary, { total: 3, success: 2, failed: 1 });
  });
});
