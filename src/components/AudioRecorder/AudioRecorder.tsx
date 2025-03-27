'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { AudioRecorderProps, RecordedAudio, RecordingState } from './types';
import { 
  saveAudioFile, 
  getFormattedDateTime, 
  createSessionId, 
  combineAudioStreams,
  getAudioMimeType,
  checkBrowserSupport
} from './utils';

/**
 * AudioRecorder component for recording both microphone and system audio
 */
export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingStart,
  onRecordingStop,
  format = 'mp3',
  className = '',
}) => {
  // State to track recording status and data
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    microphoneStream: null,
    systemStream: null,
    microphoneRecorder: null,
    systemRecorder: null,
    microphoneChunks: [],
    systemChunks: [],
    startTime: null,
    format: format,
  });

  // References to maintain access across re-renders
  const stateRef = useRef(state);
  const sessionIdRef = useRef<string>('');

  // Update the ref whenever state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Update format if prop changes
  useEffect(() => {
    setState(prevState => ({ ...prevState, format }));
  }, [format]);

  // Check browser support
  const [browserSupport, setBrowserSupport] = useState({
    supported: false,
    microphoneSupported: false,
    screenCaptureSupported: false,
    mediaRecorderSupported: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrowserSupport(checkBrowserSupport());
    }
  }, []);

  /**
   * Starts recording from both microphone and system audio
   */
  const startRecording = useCallback(async () => {
    try {
      // Generate a new session ID for this recording
      sessionIdRef.current = createSessionId();

      // Request microphone access
      const microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Request system audio access (this captures desktop audio)
      const systemStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // We need video to access system audio
        audio: true,
      });

      // Set up microphone recorder
      const microphoneRecorder = new MediaRecorder(microphoneStream);
      const microphoneChunks: Blob[] = [];

      microphoneRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          microphoneChunks.push(event.data);
        }
      };

      // Set up system audio recorder
      const systemRecorder = new MediaRecorder(systemStream);
      const systemChunks: Blob[] = [];

      systemRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          systemChunks.push(event.data);
        }
      };

      // Start recording
      microphoneRecorder.start(1000); // Collect data in 1-second chunks
      systemRecorder.start(1000);

      // Update state
      setState({
        isRecording: true,
        microphoneStream,
        systemStream,
        microphoneRecorder,
        systemRecorder,
        microphoneChunks,
        systemChunks,
        startTime: Date.now(),
        format: stateRef.current.format,
      });

      // Call onRecordingStart callback if provided
      if (onRecordingStart) {
        onRecordingStart();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please make sure you have granted the necessary permissions.');
    }
  }, [onRecordingStart]);

  /**
   * Stops recording and processes the recorded audio
   */
  const stopRecording = useCallback(async () => {
    try {
      const { 
        microphoneRecorder, 
        systemRecorder,
        microphoneChunks,
        systemChunks,
        microphoneStream,
        systemStream,
        startTime,
        format
      } = stateRef.current;

      if (!microphoneRecorder || !systemRecorder || !startTime) {
        console.error('Recording state is invalid.');
        return;
      }

      // Stop the recorders
      if (microphoneRecorder.state !== 'inactive') {
        microphoneRecorder.stop();
      }
      
      if (systemRecorder.state !== 'inactive') {
        systemRecorder.stop();
      }

      // Create blobs from chunks
      const mimeType = getAudioMimeType(format);
      const microphoneBlob = new Blob(microphoneChunks, { type: mimeType });
      const systemBlob = new Blob(systemChunks, { type: mimeType });

      // Generate filenames
      const timestamp = getFormattedDateTime();
      const sessionId = sessionIdRef.current;
      const microphoneFilename = `microphone_${timestamp}_${sessionId}.${format}`;
      const systemFilename = `system_${timestamp}_${sessionId}.${format}`;

      // Save the recordings to files
      const microphoneUrl = await saveAudioFile(microphoneBlob, microphoneFilename);
      const systemUrl = await saveAudioFile(systemBlob, systemFilename);

      // Attempt to combine the audio streams (optional)
      let combinedUrl: string | null = null;
      try {
        const combinedBlob = await combineAudioStreams(microphoneBlob, systemBlob, format);
        if (combinedBlob) {
          const combinedFilename = `combined_${timestamp}_${sessionId}.${format}`;
          combinedUrl = await saveAudioFile(combinedBlob, combinedFilename);
        }
      } catch (error) {
        console.error('Error combining audio streams:', error);
      }

      // Create results object
      const recordings: RecordedAudio = {
        microphoneAudio: microphoneUrl,
        systemAudio: systemUrl,
        combinedAudio: combinedUrl,
        timestamp: startTime,
        format,
      };

      // Stop media streams
      if (microphoneStream) {
        microphoneStream.getTracks().forEach(track => track.stop());
      }
      
      if (systemStream) {
        systemStream.getTracks().forEach(track => track.stop());
      }

      // Reset state
      setState({
        isRecording: false,
        microphoneStream: null,
        systemStream: null,
        microphoneRecorder: null,
        systemRecorder: null,
        microphoneChunks: [],
        systemChunks: [],
        startTime: null,
        format,
      });

      // Call onRecordingStop callback if provided
      if (onRecordingStop) {
        onRecordingStop(recordings);
      }

      return recordings;
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert('There was an error processing the recording.');
      
      // Reset state on error
      setState({
        isRecording: false,
        microphoneStream: null,
        systemStream: null,
        microphoneRecorder: null,
        systemRecorder: null,
        microphoneChunks: [],
        systemChunks: [],
        startTime: null,
        format: stateRef.current.format,
      });
    }
  }, [onRecordingStop]);

  /**
   * Toggle recording state
   */
  const toggleRecording = useCallback(() => {
    if (stateRef.current.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  // Calculate recording duration
  const [duration, setDuration] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (state.isRecording && state.startTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.startTime!) / 1000);
        setDuration(elapsed);
      }, 1000);
    } else {
      setDuration(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [state.isRecording, state.startTime]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Display a message if browser support is missing
  if (!browserSupport.supported) {
    return (
      <div className={`audio-recorder-unsupported ${className}`}>
        <p>Your browser doesn't support all features required for audio recording:</p>
        <ul>
          <li>MediaRecorder API: {browserSupport.mediaRecorderSupported ? '✓' : '✗'}</li>
          <li>Microphone Access: {browserSupport.microphoneSupported ? '✓' : '✗'}</li>
          <li>Screen Capture: {browserSupport.screenCaptureSupported ? '✓' : '✗'}</li>
        </ul>
        <p>Please try using a modern browser like Chrome, Edge, or Firefox.</p>
      </div>
    );
  }

  return (
    <div className={`audio-recorder ${className}`}>
      <div className="audio-recorder-controls">
        <button 
          onClick={toggleRecording}
          className={`record-button ${state.isRecording ? 'recording' : ''}`}
          aria-label={state.isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          <div className="button-content">
            <Image
              src="/microphone.svg"
              width={24}
              height={24}
              alt="Microphone"
              className="mic-icon"
            />
            <span>{state.isRecording ? 'Stop Recording' : 'Start Recording'}</span>
          </div>
        </button>
        
        <div className="format-selector">
          <label htmlFor="audio-format">Format:</label>
          <select 
            id="audio-format"
            value={state.format}
            onChange={(e) => setState(prev => ({ ...prev, format: e.target.value as 'mp3' | 'wav' }))}
            disabled={state.isRecording}
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </div>
      </div>
      
      {state.isRecording && (
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          <span className="recording-time">{formatDuration(duration)}</span>
        </div>
      )}
      
      <style jsx>{`
        .audio-recorder {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background-color: #f9f9f9;
          max-width: 500px;
          margin: 0 auto;
        }
        
        .audio-recorder-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .record-button {
          background-color: #ff4b4b;
          color: white;
          border: none;
          border-radius: 50px;
          padding: 10px 20px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .record-button.recording {
          animation: pulse 1.5s infinite;
          background-color: #ff0000;
        }
        
        .record-button:hover {
          background-color: #e04040;
        }
        
        .button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .mic-icon {
          transition: all 0.3s ease;
        }
        
        .recording .mic-icon {
          animation: pulse 1.5s infinite;
        }
        
        .format-selector {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .format-selector select {
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }
        
        .recording-dot {
          width: 12px;
          height: 12px;
          background-color: #ff0000;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }
        
        .recording-time {
          font-family: monospace;
          font-size: 18px;
        }
        
        .audio-recorder-unsupported {
          border: 1px solid #ffcccc;
          border-radius: 8px;
          padding: 20px;
          background-color: #fff5f5;
          color: #cc0000;
          max-width: 500px;
          margin: 0 auto;
        }
        
        .audio-recorder-unsupported ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
