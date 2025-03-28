import { RecordedAudio } from './types';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

/**
 * Saves recording to the server via the API
 */
export const saveRecordingToServer = async (
  sessionId: string,
  microphoneBlob: Blob,
  systemBlob: Blob,
  combinedBlob: Blob | null
): Promise<RecordedAudio> => {
  try {
    // Show loading toast
    const savePromise = apiClient.saveRecording(
      sessionId,
      microphoneBlob,
      systemBlob,
      combinedBlob
    );
    
    // Wait for the save promise with a toast
    const result = await toast.promise(savePromise, {
      loading: 'Saving recording...',
      success: 'Recording saved successfully!',
      error: (err) => err.error || 'Failed to save recording'
    });
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid server response');
    }
    
    return {
      id: result.data.id,
      documentId: result.data.id,
      microphoneAudio: result.data.microphoneAudio,
      systemAudio: result.data.systemAudio,
      combinedAudio: result.data.combinedAudio,
      timestamp: Date.now(),
      format: 'wav'
    };
  } catch (error) {
    console.error('Error saving recording to server:', error);
    throw error;
  }
};