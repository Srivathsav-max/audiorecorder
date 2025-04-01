-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'SAVED', 'COMPLETED', 'ERROR');

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "backendUrl" TEXT NOT NULL DEFAULT 'http://localhost:5432/api';

-- AlterTable
ALTER TABLE "Recording" ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "summaryData" JSONB,
ADD COLUMN     "transcriptionData" JSONB;

-- CreateIndex
CREATE INDEX "Recording_processingStatus_idx" ON "Recording"("processingStatus");
