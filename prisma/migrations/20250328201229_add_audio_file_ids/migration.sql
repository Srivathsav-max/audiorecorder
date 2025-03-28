/*
  Warnings:

  - Added the required column `microphoneAudioFileId` to the `Recording` table without a default value. This is not possible if the table is not empty.
  - Added the required column `systemAudioFileId` to the `Recording` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Recording" ADD COLUMN     "combinedAudioFileId" TEXT,
ADD COLUMN     "microphoneAudioFileId" TEXT NOT NULL,
ADD COLUMN     "systemAudioFileId" TEXT NOT NULL;
