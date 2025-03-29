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
    // Create the save promise
    const savePromise = apiClient.saveRecording(
      sessionId,
      microphoneBlob,
      systemBlob,
      combinedBlob
    );

    // Show toast while saving
    toast.promise(savePromise, {
      loading: 'Saving recording...',
      success: 'Recording saved successfully!',
      error: (err) => err.error || 'Failed to save recording'
    });

    // Await the actual result
    const result = await savePromise;
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Invalid server response');
    }
    
    return {
      id: result.data.id,
      sessionId: sessionId,
      name: `Recording ${new Date().toLocaleString()}`,
      microphoneAudio: result.data.microphoneAudio,
      systemAudio: result.data.systemAudio,
      combinedAudio: result.data.combinedAudio,
      timestamp: new Date(),
      duration: 0, // This should ideally come from the actual recording duration
      format: 'wav'
    };
  } catch (error) {
    console.error('Error saving recording to server:', error);
    throw error;
  }
};
