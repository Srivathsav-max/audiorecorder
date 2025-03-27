'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AudioRecorderProps, RecordedAudio } from './types';
import { 
  saveAudioFile, 
  getFormattedDateTime, 
  createSessionId, 
  combineAudioStreams,
  checkBrowserSupport
} from './utils';

/**
 * AudioRecorder component for recording both microphone and system audio
 */
export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingStart,
  onRecordingStop,
  className = '',
}) => {
  // State to track recording status and data
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [systemStream, setSystemStream] = useState<MediaStream | null>(null);
  const [microphoneLevel, setMicrophoneLevel] = useState<number>(0);
  const [systemLevel, setSystemLevel] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // References for audio recording and analysis
  const sessionIdRef = useRef<string>('');
  const microphoneChunksRef = useRef<Blob[]>([]);
  const systemChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const microphoneAnalyserRef = useRef<AnalyserNode | null>(null);
  const systemAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Browser support state
  const [browserSupport, setBrowserSupport] = useState<{
    supported: boolean;
    microphoneSupported: boolean;
    screenCaptureSupported: boolean;
    mediaRecorderSupported: boolean;
  }>({
    supported: false,
    microphoneSupported: false,
    screenCaptureSupported: false,
    mediaRecorderSupported: false,
  });

  // Set up audio analysis
  const setupAudioAnalysis = useCallback((stream: MediaStream, isSystem: boolean) => {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    if (isSystem) {
      systemAnalyserRef.current = analyser;
    } else {
      microphoneAnalyserRef.current = analyser;
    }
  }, []);

  // Update audio levels
  const updateLevels = useCallback(() => {
    if (!isRecording) return;

    const dataArray = new Uint8Array(128);

    if (microphoneAnalyserRef.current) {
      microphoneAnalyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setMicrophoneLevel(average / 128);
    }

    if (systemAnalyserRef.current) {
      systemAnalyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setSystemLevel(average / 128);
    }

    animationFrameRef.current = requestAnimationFrame(updateLevels);
  }, [isRecording]);

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Check browser support
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
      sessionIdRef.current = createSessionId();
      microphoneChunksRef.current = [];
      systemChunksRef.current = [];

      // Request microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneStream(micStream);
      setupAudioAnalysis(micStream, false);

      // Request system audio access
      const sysStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      setSystemStream(sysStream);
      setupAudioAnalysis(sysStream, true);

      // Set up microphone recorder
      const microphoneRecorder = new MediaRecorder(micStream);
      microphoneRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          microphoneChunksRef.current.push(event.data);
        }
      };

      // Set up system audio recorder
      const systemRecorder = new MediaRecorder(sysStream);
      systemRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          systemChunksRef.current.push(event.data);
        }
      };

      // Start recording
      microphoneRecorder.start(1000);
      systemRecorder.start(1000);
      startTimeRef.current = Date.now();
      setIsRecording(true);
      
      // Start visualization
      updateLevels();
      
      if (onRecordingStart) {
        onRecordingStart();
      }

      toast.success("Recording started");
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording. Please ensure you have granted the necessary permissions.');
    }
  }, [setupAudioAnalysis, updateLevels, onRecordingStart]);

  /**
   * Stops recording and processes the recorded audio
   */
  const stopRecording = useCallback(async () => {
    try {
      if (!startTimeRef.current) {
        throw new Error('Invalid recording state');
      }

      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Stop streams
      microphoneStream?.getTracks().forEach(track => track.stop());
      systemStream?.getTracks().forEach(track => track.stop());

      // Create blobs
      const timestamp = getFormattedDateTime();
      const sessionId = sessionIdRef.current;
      const mimeType = 'audio/wav';

      const microphoneBlob = new Blob(microphoneChunksRef.current, { type: mimeType });
      const systemBlob = new Blob(systemChunksRef.current, { type: mimeType });

      // Generate filenames
      const microphoneFilename = `microphone_${timestamp}_${sessionId}.wav`;
      const systemFilename = `system_${timestamp}_${sessionId}.wav`;

      // Save recordings
      const microphoneUrl = await saveAudioFile(microphoneBlob, microphoneFilename);
      const systemUrl = await saveAudioFile(systemBlob, systemFilename);

      // Combine audio streams
      let combinedUrl: string | null = null;
      try {
        const combinedBlob = await combineAudioStreams(microphoneBlob, systemBlob, 'wav');
        if (combinedBlob) {
          const combinedFilename = `combined_${timestamp}_${sessionId}.wav`;
          combinedUrl = await saveAudioFile(combinedBlob, combinedFilename);
        }
      } catch (error) {
        console.error('Error combining audio streams:', error);
      }

      // Reset state
      setIsRecording(false);
      setMicrophoneStream(null);
      setSystemStream(null);
      startTimeRef.current = null;
      setDuration(0);
      setMicrophoneLevel(0);
      setSystemLevel(0);

      // Create result
      const recordings: RecordedAudio = {
        microphoneAudio: microphoneUrl,
        systemAudio: systemUrl,
        combinedAudio: combinedUrl,
        timestamp: Date.now(),
        format: 'wav'
      };

      // Call callback
      if (onRecordingStop) {
        onRecordingStop(recordings);
      }

      toast.success("Recording saved successfully");
      return recordings;
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('There was an error processing the recording.');
      
      // Reset state
      setIsRecording(false);
      setMicrophoneStream(null);
      setSystemStream(null);
      startTimeRef.current = null;
      setDuration(0);
      setMicrophoneLevel(0);
      setSystemLevel(0);
    }
  }, [microphoneStream, systemStream, onRecordingStop]);

  /**
   * Toggle recording state
   */
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Update duration while recording
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording && startTimeRef.current) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!) / 1000);
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
  }, [isRecording]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Display browser compatibility warning if needed
  if (!browserSupport.supported) {
    return (
      <div className="p-4 text-red-800 bg-red-50 rounded-lg">
        <p className="mb-2">Your browser doesn't support all features required for audio recording:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>MediaRecorder API: {browserSupport.mediaRecorderSupported ? '✓' : '✗'}</li>
          <li>Microphone Access: {browserSupport.microphoneSupported ? '✓' : '✗'}</li>
          <li>Screen Capture: {browserSupport.screenCaptureSupported ? '✓' : '✗'}</li>
        </ul>
        <p className="mt-2">Please try using a modern browser like Chrome, Edge, or Firefox.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col space-y-4">
        <div className="relative w-full h-[50px] bg-gray-50 rounded-lg overflow-hidden">
          <div 
            className="absolute inset-0 bg-blue-500 opacity-50 transition-transform duration-75 origin-left"
            style={{ transform: `scaleX(${microphoneLevel})` }}
          />
          <div className="absolute inset-0 flex items-center px-4">
            <span className="text-sm font-medium">Microphone Level</span>
          </div>
        </div>

        <div className="relative w-full h-[50px] bg-gray-50 rounded-lg overflow-hidden">
          <div 
            className="absolute inset-0 bg-green-500 opacity-50 transition-transform duration-75 origin-left"
            style={{ transform: `scaleX(${systemLevel})` }}
          />
          <div className="absolute inset-0 flex items-center px-4">
            <span className="text-sm font-medium">System Audio Level</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <Button 
          onClick={toggleRecording}
          variant={isRecording ? "destructive" : "default"}
          className={`gap-2 ${isRecording ? 'animate-pulse' : ''}`}
          size="lg"
        >
          <Image
            src="/microphone.svg"
            width={24}
            height={24}
            alt="Microphone"
            className={`${isRecording ? 'animate-pulse' : ''}`}
          />
          <span>{isRecording ? 'Stop Recording' : 'Start Recording'}</span>
        </Button>
        
        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-lg">{formatDuration(duration)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
