/**
 * Saves a Blob as a file and returns the file URL
 * @param blob - The Blob to save
 * @param filename - The name to save the file as
 * @returns The URL of the saved file
 */
export const saveAudioFile = async (blob: Blob, filename: string): Promise<string> => {
  try {
    // For browser environments, we save to the public/recordings directory
    const formData = new FormData();
    formData.append('audio', blob, filename);
    
    // Send the file to the server for saving
    const response = await fetch('/api/saveRecording', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to save recording');
    }
    
    const data = await response.json();
    return data.fileUrl;
  } catch (error) {
    console.error('Error saving audio file:', error);
    // Fallback to creating a blob URL if server save fails
    return URL.createObjectURL(blob);
  }
};

/**
 * Generates a formatted date-time string for filenames
 * @returns A formatted date-time string (YYYY-MM-DD_HH-MM-SS)
 */
export const getFormattedDateTime = (): string => {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

/**
 * Creates a unique ID for the recording session
 * @returns A unique session ID
 */
export const createSessionId = (): string => {
  return Math.random().toString(36).substring(2, 12);
};

/**
 * Converts audio format 
 * @param blob - The audio blob
 * @param mimeType - The target MIME type
 * @returns A Promise resolving to the converted Blob
 */
export const convertAudioFormat = (blob: Blob, mimeType: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Create a FileReader to read the blob
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target?.result) {
        reject(new Error('Failed to read audio data'));
        return;
      }
      
      // Create an AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Decode the audio data
      audioContext.decodeAudioData(event.target.result as ArrayBuffer)
        .then((audioBuffer) => {
          // Convert the AudioBuffer to the desired format
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start(0);
          
          offlineContext.startRendering()
            .then((renderedBuffer) => {
              // Convert the rendered buffer to the desired format
              const length = renderedBuffer.length;
              const numberOfChannels = renderedBuffer.numberOfChannels;
              const sampleRate = renderedBuffer.sampleRate;
              
              const audioData = new Float32Array(length * numberOfChannels);
              
              for (let channel = 0; channel < numberOfChannels; channel++) {
                const channelData = renderedBuffer.getChannelData(channel);
                for (let i = 0; i < length; i++) {
                  audioData[i * numberOfChannels + channel] = channelData[i];
                }
              }
              
              // Create a new blob with the converted audio data
              const wavBlob = new Blob([audioData], { type: mimeType });
              resolve(wavBlob);
            })
            .catch(reject);
        })
        .catch(reject);
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading audio data'));
    };
    
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Combines two audio streams into one
 * @param microphoneBlob - The microphone audio blob
 * @param systemBlob - The system audio blob
 * @param format - The desired output format
 * @returns A Promise resolving to the combined audio Blob
 */
export const combineAudioStreams = async (
  microphoneBlob: Blob,
  systemBlob: Blob,
  format: 'mp3' | 'wav'
): Promise<Blob | null> => {
  try {
    // In a production environment, we would use Web Audio API to mix the streams
    // This is a complex operation that requires analyzing and mixing audio data
    // For this implementation, we'll simulate it by just returning the microphone audio
    // as a proof of concept

    // Implementation would involve:
    // 1. Reading both blobs as array buffers
    // 2. Decoding audio data using AudioContext
    // 3. Mixing the audio data (accounting for different lengths, channels, etc.)
    // 4. Encoding back to the desired format

    console.warn('Audio combining is not fully implemented. Returning microphone audio as fallback.');
    
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    return new Blob([await microphoneBlob.arrayBuffer()], { type: mimeType });
  } catch (error) {
    console.error('Error combining audio streams:', error);
    return null;
  }
};

/**
 * Gets the MIME type string for the selected audio format
 * @param format - The audio format ('mp3' or 'wav')
 * @returns The corresponding MIME type string
 */
export const getAudioMimeType = (format: 'mp3' | 'wav'): string => {
  return format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
};

/**
 * Checks if the browser supports all required recording features
 * @returns An object with information about browser support
 */
export const checkBrowserSupport = (): { 
  supported: boolean; 
  microphoneSupported: boolean; 
  screenCaptureSupported: boolean; 
  mediaRecorderSupported: boolean;
} => {
  const mediaRecorderSupported = typeof window !== 'undefined' && 'MediaRecorder' in window;
  const microphoneSupported = typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  const screenCaptureSupported = typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices;
  
  return {
    supported: mediaRecorderSupported && microphoneSupported && screenCaptureSupported,
    microphoneSupported,
    screenCaptureSupported,
    mediaRecorderSupported
  };
};
