-- CreateTable
CREATE TABLE "SparePartKit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SparePartKit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SparePartKitItem" (
    "id" TEXT NOT NULL,
    "kitId" TEXT NOT NULL,
    "sparePartId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SparePartKitItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SparePartKitItem_kitId_sparePartId_key" ON "SparePartKitItem"("kitId", "sparePartId");

-- AddForeignKey
ALTER TABLE "SparePartKitItem" ADD CONSTRAINT "SparePartKitItem_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "SparePartKit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SparePartKitItem" ADD CONSTRAINT "SparePartKitItem_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
