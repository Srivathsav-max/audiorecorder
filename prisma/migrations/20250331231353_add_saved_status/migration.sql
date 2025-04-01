-- Create ProcessingStatus enum type
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'SAVED', 'COMPLETED', 'ERROR');

-- Update existing records to 'SAVED' status before conversion
UPDATE "Recording" SET "processingStatus" = 'SAVED' WHERE "processingStatus" = 'PENDING';

-- Convert column to use enum type
ALTER TABLE "Recording" 
  ALTER COLUMN "processingStatus" DROP DEFAULT,
  ALTER COLUMN "processingStatus" TYPE "ProcessingStatus" USING ("processingStatus"::"ProcessingStatus"),
  ALTER COLUMN "processingStatus" SET DEFAULT 'SAVED'::"ProcessingStatus";
