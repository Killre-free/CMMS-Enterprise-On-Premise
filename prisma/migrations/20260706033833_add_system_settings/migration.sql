-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "companyName" TEXT NOT NULL DEFAULT 'My Company',
    "logoUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    "language" TEXT NOT NULL DEFAULT 'en',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
