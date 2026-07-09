-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN     "rootCause" TEXT,
ADD COLUMN     "rootCauseWhys" TEXT[] DEFAULT ARRAY[]::TEXT[];
