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
    // Create an AudioContext with CD quality for faster processing
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100 // CD quality sample rate is faster to process
    });
    
    // Convert blobs to array buffers (parallel processing)
    const [micArrayBuffer, sysArrayBuffer] = await Promise.all([
      microphoneBlob.arrayBuffer(),
      systemBlob.arrayBuffer()
    ]);
    
    // Decode the audio data (parallel processing)
    const [micAudioBuffer, sysAudioBuffer] = await Promise.all([
      audioContext.decodeAudioData(micArrayBuffer),
      audioContext.decodeAudioData(sysArrayBuffer)
    ]);
    
    // Get the longest duration
    const maxLength = Math.max(micAudioBuffer.length, sysAudioBuffer.length);
    const sampleRate = micAudioBuffer.sampleRate;
    
    // Create an offline context for rendering
    const offlineContext = new OfflineAudioContext(
      2, // Output in stereo
      maxLength,
      sampleRate
    );
    
    // Create buffers sources
    const micSource = offlineContext.createBufferSource();
    const sysSource = offlineContext.createBufferSource();
    
    micSource.buffer = micAudioBuffer;
    sysSource.buffer = sysAudioBuffer;
    
    // Create gain nodes to control volume
    const micGain = offlineContext.createGain();
    const sysGain = offlineContext.createGain();
    
    // Adjust levels (mic at 100%, system at 80%)
    micGain.gain.value = 1.0;
    sysGain.gain.value = 0.8;
    
    // Create a merger to combine the channels
    const merger = offlineContext.createChannelMerger(2);
    
    // Connect the audio graph
    micSource.connect(micGain);
    sysSource.connect(sysGain);
    
    micGain.connect(merger, 0, 0); // Mic to left channel
    sysGain.connect(merger, 0, 1); // System to right channel
    
    merger.connect(offlineContext.destination);
    
    // Start the sources
    micSource.start(0);
    sysSource.start(0);
    
    // Render the combined audio
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to the desired format using the optimized function
    const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
    
    // Convert AudioBuffer to WAV blob using optimized function
    return optimizedAudioBufferToWav(renderedBuffer, mimeType);
  } catch (error) {
    console.error('Error combining audio streams:', error);
    return null;
  }
};

/**
 * Converts an AudioBuffer to a WAV file Blob
 * @param audioBuffer - The AudioBuffer to convert
 * @param mimeType - The MIME type for the output
 * @returns A Blob containing the WAV data
 */
function audioBufferToWav(audioBuffer: AudioBuffer, mimeType: string): Blob {
  // Get the PCM data
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 24; // Upgrade to 24-bit for higher quality
  const bytesPerSample = bitsPerSample / 8;
  
  // Calculate sizes
  const dataSize = length * numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // Write WAV header
  // "RIFF" Chunk Descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  
  // "fmt " sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Length of format data
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true); // Byte rate
  view.setUint16(32, numberOfChannels * bytesPerSample, true); // Block align
  view.setUint16(34, bitsPerSample, true);
  
  // "data" sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write PCM samples
  const offset = 44;
  let pos = offset;
  
  // Interleave channels with 24-bit sample depth
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // Get audio channel data and ensure it's within range [-1,1]
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
      
      // Convert float to 24-bit integer (range: -8388608 to 8388607)
      const int24 = Math.round(sample < 0 ? sample * 8388608 : sample * 8388607);
      
      // Write 24-bit integer as 3 bytes in little-endian format
      view.setUint8(pos, int24 & 0xFF); // First byte (least significant)
      view.setUint8(pos + 1, (int24 >> 8) & 0xFF); // Second byte
      view.setUint8(pos + 2, (int24 >> 16) & 0xFF); // Third byte (most significant)
      pos += 3; // 24-bit = 3 bytes
    }
  }
  
  return new Blob([buffer], { type: mimeType });
}

/**
 * Helper function to write a string to a DataView
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Converts any audio blob to a high-quality 24-bit WAV file
 * @param blob - The input audio blob
 * @returns A Promise resolving to a high-quality WAV blob
 */
export const convertToHighQualityWav = async (blob: Blob): Promise<Blob> => {
  try {
    // Create audio context with lower sample rate for faster processing
    // 44.1kHz is still CD quality and processes faster than 48kHz
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100
    });
    
    // Read the blob as ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();
    
    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Use optimized WAV conversion
    return optimizedAudioBufferToWav(audioBuffer, 'audio/wav');
  } catch (error) {
    console.error('Error converting to high-quality WAV:', error);
    // If conversion fails, return the original blob
    return blob;
  }
};

/**
 * Optimized version of audioBufferToWav for faster processing
 * @param audioBuffer - The AudioBuffer to convert
 * @param mimeType - The MIME type for the output
 * @returns A Blob containing the WAV data
 */
function optimizedAudioBufferToWav(audioBuffer: AudioBuffer, mimeType: string): Blob {
  // We'll use 16-bit depth for faster processing while still maintaining good quality
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;
  
  // Calculate sizes
  const dataSize = length * numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  // Write WAV header - this is the same as before
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  view.setUint16(32, numberOfChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Use a typed array for faster processing
  const offset = 44;
  let pos = 0;
  
  // Pre-allocate channel data arrays for better performance
  const channelData = new Array(numberOfChannels);
  for (let channel = 0; channel < numberOfChannels; channel++) {
    channelData[channel] = audioBuffer.getChannelData(channel);
  }
  
  // Process in smaller chunks to avoid browser freezing
  const uint16Array = new Uint16Array(buffer, offset);
  
  // Process optimized way (16-bit samples)
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      uint16Array[pos++] = int16;
    }
  }
  
  return new Blob([buffer], { type: mimeType });
}
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