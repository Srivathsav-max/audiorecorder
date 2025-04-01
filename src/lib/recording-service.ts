import { storageService } from '@/lib/appwrite';
import { prisma } from './prisma';
import { getFormattedDateTime } from '@/components/AudioRecorder/utils';
import { TranscriptionData, SummaryData } from '@/lib/api-client';
import { Prisma, ProcessingStatus} from '@prisma/client';
import { getBackendUrl } from './settings-service';

export const getAudioFileUrl = (fileId: string): string => {
  if (!fileId) return '';
  return storageService.getFilePreview(fileId);
};

// Save audio file to Appwrite storage
export const saveAudioFileToAppwrite = async (file: File): Promise<string> => {
  try {
    console.log(`Saving ${file.name} to Appwrite (size: ${file.size} bytes, type: ${file.type})`);
    
    // Upload the file directly since it's already a proper File object
    const fileId = await storageService.uploadFile(file, file.name);
    console.log(`Successfully saved ${file.name} to Appwrite, file ID: ${fileId}`);
    return fileId;
  } catch (error) {
    console.error(`Error saving ${file.name} to Appwrite:`, error);
    throw error;
  }
};

// Save recording session to Postgres via Prisma and files to Appwrite storage
export interface SavedRecordingResult {
  id: string;
  microphoneAudioUrl: string;
  systemAudioUrl: string;
  combinedAudioUrl: string | null;
}

interface ProcessAudioResult {
  transcriptionData: TranscriptionData;
  summaryData: SummaryData;
}

export const processAudio = async (audioFile: File): Promise<ProcessAudioResult> => {
  try {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('diarize', 'true');
    formData.append('transcribe', 'true');
    formData.append('summarize', 'true');

    const backendUrl = await getBackendUrl();
    const response = await fetch(`${backendUrl}/api/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process audio: ${response.statusText}. ${errorText}`);
    }

    const result = await response.json();
    return {
      transcriptionData: {
        segments: result.outputs.transcription.segments,
        duration: result.outputs.diarization?.duration,
        language: result.outputs.transcription?.language
      },
      summaryData: {
        summary: result.outputs.summary.text || '',
        lastModified: new Date().toISOString(),
        extracted_info: result.outputs.summary.extracted_info || {}
      }
    };
  } catch (error) {
    console.error('Error processing audio:', error);
    throw error;
  }
};

export const saveRecording = async (
  sessionId: string,
  microphoneFile: File,
  systemFile: File,
  combinedFile: File | null,
  userId: string
): Promise<SavedRecordingResult> => {
  try {
    const timestamp = getFormattedDateTime();

    // Save microphone audio
    console.log(`Processing microphone audio: ${microphoneFile.name}`);
    const microphoneFileId = await saveAudioFileToAppwrite(microphoneFile);
    
    // Save system audio
    console.log(`Processing system audio: ${systemFile.name}`);
    const systemFileId = await saveAudioFileToAppwrite(systemFile);
    
    // Save combined audio if available
    let combinedFileId = '';
    
    if (combinedFile) {
      console.log(`Processing combined audio: ${combinedFile.name}`);
      combinedFileId = await saveAudioFileToAppwrite(combinedFile);
    }
    
    // Process the combined audio if available, otherwise use microphone audio
    // Create initial record in database using Prisma
    const recording = await prisma.recording.create({
      data: {
        appwriteId: sessionId,
        name: `Recording ${timestamp}`,
        duration: 0, // Will be updated after processing
        userId,
        microphoneAudioFileId: microphoneFileId,
        systemAudioFileId: systemFileId,
        combinedAudioFileId: combinedFileId || null,
        processingStatus: 'PENDING'
      }
    });
    
    // Process audio in background
    const audioToProcess = combinedFile || microphoneFile;
    processAudio(audioToProcess).then(async (processedData) => {
      // Update record with processed data
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          duration: processedData.transcriptionData.duration || 0,
          transcriptionData: processedData.transcriptionData as Prisma.InputJsonValue,
          summaryData: processedData.summaryData as Prisma.InputJsonValue,
          processingStatus: 'COMPLETED',
          processedAt: new Date()
        }
      });
    }).catch(async (error) => {
      console.error('Error processing audio:', error);
      await prisma.recording.update({
        where: { id: recording.id },
        data: {
          processingStatus: 'FAILED',
        }
      });
    });

    // Return initial URLs and record ID immediately
    return {
      id: recording.id,
      microphoneAudioUrl: getAudioFileUrl(microphoneFileId),
      systemAudioUrl: getAudioFileUrl(systemFileId),
      combinedAudioUrl: combinedFileId ? getAudioFileUrl(combinedFileId) : null
    };
  } catch (error) {
    console.error('Error saving recording:', error);
    throw error;
  }
};

// Delete recording
export const deleteRecording = async (id: string): Promise<void> => {
  try {
    // Get the recording details
    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    // Delete all associated files from Appwrite
    const filesToDelete = [
      recording.microphoneAudioFileId,
      recording.systemAudioFileId
    ];
    
    if (recording.combinedAudioFileId) {
      filesToDelete.push(recording.combinedAudioFileId);
    }
    
    // Delete each file from Appwrite
    for (const fileId of filesToDelete) {
      if (fileId) {
        await storageService.deleteFile(fileId);
      }
    }
    
    // Delete the record from Postgres
    await prisma.recording.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
};
