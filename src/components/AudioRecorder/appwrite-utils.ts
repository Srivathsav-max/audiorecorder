import { storageService, databaseService, AudioFileDocument, CreateAudioDocument } from '@/lib/appwrite';
import { getFormattedDateTime } from './utils';

// Save audio file to Appwrite storage
export const saveAudioFileToAppwrite = async (blob: Blob, filename: string): Promise<string> => {
  try {
    console.log(`Saving ${filename} to Appwrite (size: ${blob.size} bytes, type: ${blob.type})`);
    const fileId = await storageService.uploadFile(blob, filename);
    console.log(`Successfully saved ${filename} to Appwrite, file ID: ${fileId}`);
    return fileId;
  } catch (error) {
    console.error(`Error saving ${filename} to Appwrite:`, error);
    throw error;
  }
};

// Get audio file URL from Appwrite
export const getAudioFileUrl = (fileId: string): string => {
  if (!fileId) return '';
  return storageService.getFilePreview(fileId);
};

// Save recording session to Appwrite database and storage
export interface SavedRecordingResult {
  documentId: string;
  microphoneAudioUrl: string;
  systemAudioUrl: string;
  combinedAudioUrl: string | null;
}

export const saveRecordingToAppwrite = async (
  sessionId: string,
  microphoneBlob: Blob,
  systemBlob: Blob,
  combinedBlob: Blob | null
): Promise<SavedRecordingResult> => {
  try {
    const timestamp = getFormattedDateTime();
    
    // Save microphone audio
    const microphoneFilename = `microphone_${timestamp}_${sessionId}.wav`;
    const microphoneFileId = await saveAudioFileToAppwrite(microphoneBlob, microphoneFilename);
    
    // Save system audio
    const systemFilename = `system_${timestamp}_${sessionId}.wav`;
    const systemFileId = await saveAudioFileToAppwrite(systemBlob, systemFilename);
    
    // Save combined audio if available
    let combinedFileId = '';
    
    if (combinedBlob) {
      const combinedFilename = `combined_${timestamp}_${sessionId}.wav`;
      combinedFileId = await saveAudioFileToAppwrite(combinedBlob, combinedFilename);
    }
    
    // Create document in database
    const documentData: CreateAudioDocument = {
      sessionId,
      microphoneAudioFileId: microphoneFileId,
      systemAudioFileId: systemFileId,
      combinedAudioFileId: combinedFileId || undefined
    };
    
    const documentId = await databaseService.createAudioDocument(documentData);
    
    // Return URLs and document ID
    return {
      documentId,
      microphoneAudioUrl: getAudioFileUrl(microphoneFileId),
      systemAudioUrl: getAudioFileUrl(systemFileId),
      combinedAudioUrl: combinedFileId ? getAudioFileUrl(combinedFileId) : null
    };
  } catch (error) {
    console.error('Error saving recording to Appwrite:', error);
    throw error;
  }
};

// Delete recording from Appwrite
export const deleteRecording = async (documentId: string, document: AudioFileDocument): Promise<void> => {
  try {
    // Delete all associated files first
    const filesToDelete = [
      document.microphoneAudioFileId,
      document.systemAudioFileId
    ];
    
    if (document.combinedAudioFileId) {
      filesToDelete.push(document.combinedAudioFileId);
    }
    
    // Delete each file
    for (const fileId of filesToDelete) {
      if (fileId) {
        await storageService.deleteFile(fileId);
      }
    }
    
    // Delete the document
    await databaseService.deleteAudioDocument(documentId);
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
};
