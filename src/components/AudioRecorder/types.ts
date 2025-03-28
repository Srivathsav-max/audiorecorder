export interface RecordedAudio {
  id: string;            // PostgreSQL record ID
  sessionId: string;     // Appwrite ID (for storage)
  name: string;
  microphoneAudio: string;
  systemAudio: string;
  combinedAudio: string | null;
  timestamp: Date;
  duration: number;
  format: 'wav';
}

export interface AudioRecorderProps {
  /**
   * Callback function when recording starts
   */
  onRecordingStart?: () => void;

  /**
   * Callback function when recording stops, provides recorded audio data
   */
  onRecordingStop?: (recordings: RecordedAudio) => void;

  /**
   * Custom class name for styling
   */
  className?: string;
}

export interface AudioDevice {
  id: string;
  label: string;
  kind: string;
}

export interface AudioLevels {
  microphone: number;
  system: number;
}

export interface AudioAnalyzer {
  context: AudioContext;
  analyser: AnalyserNode;
  dataArray: Uint8Array;
}
