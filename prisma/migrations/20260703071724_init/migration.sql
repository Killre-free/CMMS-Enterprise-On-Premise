-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('view', 'add', 'edit', 'delete');

-- CreateEnum
CREATE TYPE "MachineLifeCycleStatus" AS ENUM ('Active', 'UnderMaintenance', 'Retired');

-- CreateEnum
CREATE TYPE "WorkOrderPriority" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('ProductionRequest', 'WaitingTechnician', 'Accepted', 'InProgress', 'WaitingSparePart', 'WaitingMaker', 'WaitingProduction', 'WaitingBudgetApproval', 'Completed', 'WaitingApproval', 'Closed');

-- CreateEnum
CREATE TYPE "PMFrequencyType" AS ENUM ('Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'RunningHour');

-- CreateEnum
CREATE TYPE "CheckSheetFieldType" AS ENUM ('Text', 'Number', 'Boolean', 'Select', 'Photo', 'Signature', 'Calculated', 'Date');

-- CreateEnum
CREATE TYPE "CheckSheetLinkedType" AS ENUM ('Standalone', 'WorkOrder', 'PM');

-- CreateEnum
CREATE TYPE "CheckSheetSubmissionStatus" AS ENUM ('Draft', 'Submitted');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('Receive', 'Issue', 'Return', 'Adjustment');

-- CreateEnum
CREATE TYPE "ReorderSuggestionReason" AS ENUM ('BelowSafetyStock');

-- CreateEnum
CREATE TYPE "ReorderSuggestionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Ordered');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('Info', 'Warning', 'Critical');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,
    "isGranted" BOOLEAN NOT NULL,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "shift" TEXT,
    "departmentId" TEXT,
    "plantId" TEXT,
    "roleId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedUntil" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "forcePasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "machineCode" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "criticality" TEXT,
    "installedAt" TIMESTAMP(3),
    "departmentId" TEXT,
    "plantId" TEXT,
    "lifeCycleStatus" "MachineLifeCycleStatus" NOT NULL DEFAULT 'Active',
    "runningHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qrCode" TEXT,
    "barcode" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "woNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "WorkOrderPriority" NOT NULL DEFAULT 'Medium',
    "status" "WorkOrderStatus" NOT NULL DEFAULT 'ProductionRequest',
    "machineId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "reportPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completionPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "version" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderStateHistory" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "fromStatus" "WorkOrderStatus",
    "toStatus" "WorkOrderStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voiceNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,

    CONSTRAINT "WorkOrderStateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrderSparePart" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,

    CONSTRAINT "WorkOrderSparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PMPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "machineId" TEXT NOT NULL,
    "frequencyType" "PMFrequencyType" NOT NULL,
    "frequencyValue" DOUBLE PRECISION,
    "nextDueAt" TIMESTAMP(3),
    "lastGeneratedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PMPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckSheetTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'Classic',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckSheetTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckSheetField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "CheckSheetFieldType" NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "config" JSONB,

    CONSTRAINT "CheckSheetField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckSheetSubmission" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "linkedType" "CheckSheetLinkedType" NOT NULL DEFAULT 'Standalone',
    "linkedWorkOrderId" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "CheckSheetSubmissionStatus" NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckSheetSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckSheetResponse" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" JSONB,
    "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CheckSheetResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePart" (
    "id" TEXT NOT NULL,
    "partCode" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safetyStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxStock" DOUBLE PRECISION,
    "unitCost" DOUBLE PRECISION,
    "category" TEXT,
    "location" TEXT,
    "qrCode" TEXT,
    "barcode" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "performedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReorderSuggestion" (
    "id" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "suggestedQty" DOUBLE PRECISION NOT NULL,
    "reason" "ReorderSuggestionReason" NOT NULL,
    "status" "ReorderSuggestionStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReorderSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'Info',
    "module" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "recordId" TEXT,
    "recordType" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleLicense" (
    "id" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ModuleLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_moduleKey_action_key" ON "RolePermission"("roleId", "moduleKey", "action");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermissionOverride_userId_moduleKey_action_key" ON "UserPermissionOverride"("userId", "moduleKey", "action");

-- CreateIndex
CREATE UNIQUE INDEX "Plant_code_key" ON "Plant"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_machineCode_key" ON "Machine"("machineCode");

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_woNumber_key" ON "WorkOrder"("woNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SparePart_partCode_key" ON "SparePart"("partCode");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleLicense_moduleKey_key" ON "ModuleLicense"("moduleKey");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderStateHistory" ADD CONSTRAINT "WorkOrderStateHistory_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderStateHistory" ADD CONSTRAINT "WorkOrderStateHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSparePart" ADD CONSTRAINT "WorkOrderSparePart_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrderSparePart" ADD CONSTRAINT "WorkOrderSparePart_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PMPlan" ADD CONSTRAINT "PMPlan_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetField" ADD CONSTRAINT "CheckSheetField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CheckSheetTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetSubmission" ADD CONSTRAINT "CheckSheetSubmission_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CheckSheetTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetSubmission" ADD CONSTRAINT "CheckSheetSubmission_linkedWorkOrderId_fkey" FOREIGN KEY ("linkedWorkOrderId") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetSubmission" ADD CONSTRAINT "CheckSheetSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetResponse" ADD CONSTRAINT "CheckSheetResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CheckSheetSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckSheetResponse" ADD CONSTRAINT "CheckSheetResponse_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "CheckSheetField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReorderSuggestion" ADD CONSTRAINT "ReorderSuggestion_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
