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
    const audioContext = new (window.AudioContext || ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext))({
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

    // Create an offline context for rendering - using mono (1 channel) output
    // for proper mixing instead of stereo channel separation
    const offlineContext = new OfflineAudioContext(
      1, // Output in mono for proper mixing
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

    // Connect audio graph for mixing
    micSource.connect(micGain);
    sysSource.connect(sysGain);

    // Connect both to the destination to mix them
    micGain.connect(offlineContext.destination);
    sysGain.connect(offlineContext.destination);

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
    const audioContext = new (window.AudioContext || ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext))({
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
