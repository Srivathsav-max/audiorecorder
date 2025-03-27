export interface AudioRecorderProps {
  /**
   * Callback function triggered when recording starts
   */
  onRecordingStart?: () => void;
  
  /**
   * Callback function triggered when recording stops
   */
  onRecordingStop?: (recordings: RecordedAudio) => void;
  
  /**
   * The format to save the audio in
   * @default 'mp3'
   */
  format?: 'mp3' | 'wav';
  
  /**
   * Custom class name for the component
   */
  className?: string;
}

export interface RecordedAudio {
  /**
   * Microphone audio blob URL
   */
  microphoneAudio: string | null;
  
  /**
   * System audio blob URL
   */
  systemAudio: string | null;
  
  /**
   * Combined audio blob URL (if available)
   */
  combinedAudio?: string | null;
  
  /**
   * Timestamp when the recording started
   */
  timestamp: number;
  
  /**
   * Format of the audio file
   */
  format: 'mp3' | 'wav';
}

export interface RecordingState {
  isRecording: boolean;
  microphoneStream: MediaStream | null;
  systemStream: MediaStream | null;
  microphoneRecorder: MediaRecorder | null;
  systemRecorder: MediaRecorder | null;
  microphoneChunks: Blob[];
  systemChunks: Blob[];
  startTime: number | null;
  format: 'mp3' | 'wav';
}
