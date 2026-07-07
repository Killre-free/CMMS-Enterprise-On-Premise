import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseOrThrow,
  workOrderCreateSchema,
  changePasswordSchema,
  userCreateSchema,
  stockTransactionSchema,
  machineImportRowSchema,
  sparePartImportRowSchema,
  userImportRowSchema,
} from "@/lib/validators";

describe("parseOrThrow", () => {
  it("returns the parsed data when valid", () => {
    const result = parseOrThrow(workOrderCreateSchema, {
      title: "Fix the pump",
      machineId: "m1",
    });
    assert.equal(result.title, "Fix the pump");
    assert.equal(result.priority, "Medium"); // schema default
  });

  it("throws a 422-shaped error with per-field issues when invalid", () => {
    assert.throws(
      () => parseOrThrow(workOrderCreateSchema, { title: "", machineId: "" }),
      (err: any) => {
        assert.equal(err.status, 422);
        assert.equal(err.message, "VALIDATION_ERROR");
        const paths = err.issues.map((i: any) => i.path);
        assert.ok(paths.includes("title"));
        assert.ok(paths.includes("machineId"));
        return true;
      }
    );
  });
});

describe("changePasswordSchema", () => {
  it("rejects a new password shorter than 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever",
      newPassword: "short",
    });
    assert.equal(result.success, false);
  });

  it("accepts a valid payload", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever",
      newPassword: "longenough123",
    });
    assert.equal(result.success, true);
  });
});

describe("userCreateSchema", () => {
  it("rejects a username shorter than 3 characters", () => {
    const result = userCreateSchema.safeParse({
      employeeId: "E1",
      username: "ab",
      password: "password123",
      firstName: "A",
      lastName: "B",
      roleId: "r1",
    });
    assert.equal(result.success, false);
  });

  it("rejects an invalid email but accepts a missing one (optional)", () => {
    const base = {
      employeeId: "E1",
      username: "abc",
      password: "password123",
      firstName: "A",
      lastName: "B",
      roleId: "r1",
    };
    assert.equal(userCreateSchema.safeParse({ ...base, email: "not-an-email" }).success, false);
    assert.equal(userCreateSchema.safeParse(base).success, true);
  });
});

describe("stockTransactionSchema", () => {
  it("rejects a zero or negative quantity", () => {
    const result = stockTransactionSchema.safeParse({
      sparePartId: "sp1",
      type: "Issue",
      quantity: 0,
    });
    assert.equal(result.success, false);
  });

  it("accepts a valid Receive transaction", () => {
    const result = stockTransactionSchema.safeParse({
      sparePartId: "sp1",
      type: "Receive",
      quantity: 10,
      unitCost: 5.5,
    });
    assert.equal(result.success, true);
  });
});

describe("machineImportRowSchema", () => {
  it("requires machineCode and machineName", () => {
    const result = machineImportRowSchema.safeParse({ manufacturer: "Haas" });
    assert.equal(result.success, false);
  });

  it("accepts a minimal valid row using human-readable relation names", () => {
    const result = machineImportRowSchema.safeParse({
      machineCode: "MC-001",
      machineName: "CNC Lathe",
      departmentName: "Production",
      plantCode: "PLT-01",
    });
    assert.equal(result.success, true);
  });
});

describe("sparePartImportRowSchema", () => {
  it("coerces spreadsheet numeric strings into numbers", () => {
    const result = sparePartImportRowSchema.safeParse({
      partCode: "SP-001",
      partName: "Ball Bearing",
      unit: "pcs",
      safetyStock: "5",
      currentStock: "10",
    });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.safetyStock, 5);
      assert.equal(result.data.currentStock, 10);
    }
  });

  it("rejects a missing safetyStock", () => {
    const result = sparePartImportRowSchema.safeParse({
      partCode: "SP-001",
      partName: "Ball Bearing",
      unit: "pcs",
    });
    assert.equal(result.success, false);
  });
});

describe("userImportRowSchema", () => {
  it("requires roleName since roleId is not human-readable", () => {
    const result = userImportRowSchema.safeParse({
      employeeId: "E1",
      username: "jsmith",
      password: "password123",
      firstName: "John",
      lastName: "Smith",
    });
    assert.equal(result.success, false);
  });

  it("accepts a valid row with roleName resolved later at the API layer", () => {
    const result = userImportRowSchema.safeParse({
      employeeId: "E1",
      username: "jsmith",
      password: "password123",
      firstName: "John",
      lastName: "Smith",
      roleName: "Technician",
    });
    assert.equal(result.success, true);
  });
});
