import { RecordedAudio } from './types';
import { getCookie, AUTH_COOKIE_NAME } from '@/lib/cookies';
import { toast } from 'sonner';

interface SaveRecordingResponse {
  success: boolean;
  result: {
    id: string;
    microphoneAudioUrl: string;
    systemAudioUrl: string;
    combinedAudioUrl: string | null;
  };
}

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
    const token = getCookie(AUTH_COOKIE_NAME);
    
    if (!token) {
      throw new Error('Authentication required to save recording');
    }
    
    // Create FormData to send blobs
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('microphoneAudio', microphoneBlob, `microphone_${sessionId}.wav`);
    formData.append('systemAudio', systemBlob, `system_${sessionId}.wav`);
    
    if (combinedBlob) {
      formData.append('combinedAudio', combinedBlob, `combined_${sessionId}.wav`);
    }
    
    // Make the API request first
    const response = await fetch('/api/recordings/save', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save recording');
    }

    const data = await response.json() as SaveRecordingResponse;
    
    // Show success toast
    toast.success('Recording saved successfully!');
    
    if (!data.success || !data.result) {
      throw new Error('Invalid server response');
    }
    
    const now = new Date();
    return {
      id: data.result.id,
      sessionId,
      name: `Recording ${now.toLocaleString()}`,
      microphoneAudio: data.result.microphoneAudioUrl,
      systemAudio: data.result.systemAudioUrl,
      combinedAudio: data.result.combinedAudioUrl,
      timestamp: now,
      duration: 0,
      format: 'wav'
    };
  } catch (error) {
    console.error('Error saving recording to server:', error);
    // Show error toast
    toast.error((error as Error).message || 'Failed to save recording');
    throw error;
  }
};
