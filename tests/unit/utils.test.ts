import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWoNumber, paginationParams, problem, formatCurrencyTHB } from "@/lib/utils";

describe("buildWoNumber", () => {
  it("pads the sequence to 5 digits", () => {
    const date = new Date("2026-07-06T00:00:00.000Z");
    assert.equal(buildWoNumber(7, date), "WO-202607-00007");
  });

  it("pads the month to 2 digits", () => {
    const date = new Date("2026-01-01T00:00:00.000Z");
    assert.equal(buildWoNumber(1, date), "WO-202601-00001");
  });

  it("does not truncate a sequence already wider than 5 digits", () => {
    const date = new Date("2026-07-06T00:00:00.000Z");
    assert.equal(buildWoNumber(123456, date), "WO-202607-123456");
  });
});

describe("paginationParams", () => {
  it("defaults to page 1, pageSize 20", () => {
    const result = paginationParams(new URLSearchParams());
    assert.deepEqual(result, { page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it("computes skip/take for a later page", () => {
    const result = paginationParams(new URLSearchParams("page=3&pageSize=50"));
    assert.deepEqual(result, { page: 3, pageSize: 50, skip: 100, take: 50 });
  });

  it("clamps page below 1 up to 1", () => {
    const result = paginationParams(new URLSearchParams("page=0"));
    assert.equal(result.page, 1);
  });

  it("rejects a pageSize outside the allowed set and falls back to 20", () => {
    const result = paginationParams(new URLSearchParams("pageSize=17"));
    assert.equal(result.pageSize, 20);
  });
});

describe("problem", () => {
  it("builds an RFC 7807 shape with a slugified type from the title by default", () => {
    const result = problem(404, "Not Found", "No such record.", "/api/v1/machines/x");
    assert.deepEqual(result, {
      type: "https://cmms.app/errors/not-found",
      title: "Not Found",
      status: 404,
      detail: "No such record.",
      instance: "/api/v1/machines/x",
    });
  });

  it("uses the explicit typeSlug when given", () => {
    const result = problem(422, "Validation Error", "Bad input.", "/api/v1/users", "validation-error");
    assert.equal(result.type, "https://cmms.app/errors/validation-error");
  });
});

describe("formatCurrencyTHB", () => {
  it("formats a number as Thai Baht with 2 decimal places", () => {
    const result = formatCurrencyTHB(1234.5);
    assert.ok(result.includes("1,234.50"));
  });
});
