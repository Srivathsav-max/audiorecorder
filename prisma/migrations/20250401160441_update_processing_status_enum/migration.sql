/*
  Warnings:

  - The values [SAVED,ERROR] on the enum `ProcessingStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProcessingStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
ALTER TABLE "Recording" ALTER COLUMN "processingStatus" DROP DEFAULT;
ALTER TABLE "Recording" ALTER COLUMN "processingStatus" TYPE "ProcessingStatus_new" USING ("processingStatus"::text::"ProcessingStatus_new");
ALTER TYPE "ProcessingStatus" RENAME TO "ProcessingStatus_old";
ALTER TYPE "ProcessingStatus_new" RENAME TO "ProcessingStatus";
DROP TYPE "ProcessingStatus_old";
ALTER TABLE "Recording" ALTER COLUMN "processingStatus" SET DEFAULT 'PENDING';
COMMIT;
