-- AlterEnum
ALTER TYPE "CheckSheetLinkedType" ADD VALUE 'Machine';

-- AlterTable
ALTER TABLE "CheckSheetSubmission" ADD COLUMN     "machineId" TEXT;

-- AddForeignKey
ALTER TABLE "CheckSheetSubmission" ADD CONSTRAINT "CheckSheetSubmission_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
