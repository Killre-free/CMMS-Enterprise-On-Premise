// lib/validators.ts
import { z } from "zod";

/** Throws a 422-shaped error (caught by withApiHandler) if `schema` rejects `data`. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const err = new Error("VALIDATION_ERROR") as Error & { status: number; issues: unknown };
    err.status = 422;
    err.issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw err;
  }
  return result.data;
}

// ── Work Orders ─────────────────────────────────────────────────────────

export const workOrderCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).default("Medium"),
  machineId: z.string().min(1),
  assignedToId: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
  reportPhotos: z.array(z.string()).optional(),
});

export const workOrderTransitionSchema = z.object({
  toStatus: z.enum([
    "ProductionRequest",
    "WaitingTechnician",
    "Accepted",
    "InProgress",
    "WaitingSparePart",
    "WaitingMaker",
    "WaitingProduction",
    "WaitingBudgetApproval",
    "Completed",
    "WaitingApproval",
    "Closed",
  ]),
  version: z.number().int(),
  comment: z.string().optional(),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  voiceNotes: z.array(z.string()).optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
});

// ── Machines ────────────────────────────────────────────────────────────

export const machineCreateSchema = z.object({
  machineCode: z.string().min(1),
  machineName: z.string().min(1),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().optional(),
  criticality: z.string().optional(),
  departmentId: z.string().optional(),
  plantId: z.string().optional(),
  lifeCycleStatus: z.enum(["Active", "UnderMaintenance", "Retired"]).optional(),
});

export const machineUpdateSchema = machineCreateSchema.partial();

// ── Users ───────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  employeeId: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  shift: z.string().optional(),
  departmentId: z.string().optional(),
  supervisorId: z.string().optional(),
  roleId: z.string().min(1),
  plantId: z.string().optional(),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  shift: z.string().optional(),
  departmentId: z.string().optional(),
  supervisorId: z.string().optional(),
  roleId: z.string().optional(),
  plantId: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// ── Preventive Maintenance ─────────────────────────────────────────────

export const pmPlanCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  machineId: z.string().min(1),
  frequencyType: z.enum(["Daily", "Weekly", "Monthly", "Quarterly", "Yearly", "RunningHour"]),
  frequencyValue: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

// ── Spare Parts ─────────────────────────────────────────────────────────

export const sparePartCreateSchema = z.object({
  partCode: z.string().min(1),
  partName: z.string().min(1),
  unit: z.string().min(1),
  currentStock: z.number().nonnegative().optional(),
  safetyStock: z.number().nonnegative(),
  maxStock: z.number().nonnegative().optional(),
  unitCost: z.number().nonnegative().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
});

export const sparePartUpdateSchema = sparePartCreateSchema.partial();

export const stockTransactionSchema = z.object({
  sparePartId: z.string().min(1),
  type: z.enum(["Receive", "Issue", "Return", "Adjustment"]),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
});

// ── Roles & Permissions ────────────────────────────────────────────────

export const roleCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const roleUpdateSchema = roleCreateSchema.partial();

export const permissionMatrixSchema = z.object({
  permissions: z.array(
    z.object({
      moduleKey: z.string().min(1),
      action: z.enum(["view", "add", "edit", "delete"]),
      granted: z.boolean(),
    })
  ),
});

// ── Check Sheets ────────────────────────────────────────────────────────

const checkSheetFieldSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["Text", "Number", "Boolean", "Select", "Photo", "Signature", "Calculated", "Date"]),
  label: z.string().min(1),
  required: z.boolean().default(false),
  order: z.number().int(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const checkSheetTemplateCreateSchema = z.object({
  name: z.string().min(1),
  fields: z.array(checkSheetFieldSchema).min(1),
});

export const checkSheetSubmissionSchema = z.object({
  templateId: z.string().min(1),
  linkedType: z.enum(["Standalone", "WorkOrder", "PM"]).default("Standalone"),
  linkedWorkOrderId: z.string().optional(),
  status: z.enum(["Draft", "Submitted"]).default("Draft"),
  responses: z.array(
    z.object({
      fieldId: z.string().min(1),
      value: z.unknown(),
      attachments: z.array(z.string()).optional(),
    })
  ),
});
