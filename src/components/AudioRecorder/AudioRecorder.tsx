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
  checkBrowserSupport,
  convertToHighQualityWav
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
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
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

      // Request microphone access with high-quality audio settings
      const micStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          sampleSize: 24,
          channelCount: 1
        } 
      });
      setMicrophoneStream(micStream);
      setupAudioAnalysis(micStream, false);

      // Request system audio access (we need video:true for browser to show screen selection dialog, but we'll discard the video)
      const sysStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required to show dialog, but we'll remove the video track
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          sampleSize: 24
        },
      });
      
      // Remove video tracks - we only want audio
      sysStream.getVideoTracks().forEach(track => track.stop());
      
      // Create audio-only stream with the system audio
      const systemAudioStream = new MediaStream();
      sysStream.getAudioTracks().forEach(track => systemAudioStream.addTrack(track));
      setSystemStream(systemAudioStream);
      setupAudioAnalysis(systemAudioStream, true);

      // Set up microphone recorder with high quality options
      const microphoneRecorder = new MediaRecorder(micStream, {
        mimeType: 'audio/webm;codecs=pcm',
        audioBitsPerSecond: 256000 // 256 kbps for high quality
      });
      microphoneRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          microphoneChunksRef.current.push(event.data);
        }
      };

      // Set up system audio recorder with high quality options
      const systemRecorder = new MediaRecorder(systemAudioStream, {
        mimeType: 'audio/webm;codecs=pcm',
        audioBitsPerSecond: 256000 // 256 kbps for high quality
      });
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
      // Check error type and provide more specific messages
      let errorMessage = 'Failed to start recording. Please ensure you have granted the necessary permissions.';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permission denied. Please allow access to your microphone and screen sharing.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No microphone was found. Please connect a microphone and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Your microphone or system audio is already in use by another application.';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Recording was aborted. Please try again.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Your browser does not support the required audio features.';
        }
      }
      
      toast.error(errorMessage);
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

      // Update UI state immediately
      setIsRecording(false);
      setIsProcessing(true);
      toast.info("Processing audio recording...");

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
      
      // Use raw audio data for best quality conversion
      const microphoneBlob = new Blob(microphoneChunksRef.current);
      const systemBlob = new Blob(systemChunksRef.current);
      
      // Convert to high-quality WAV before saving
      const mimeType = 'audio/wav';
      const microphoneWavBlob = await convertToHighQualityWav(microphoneBlob);
      const systemWavBlob = await convertToHighQualityWav(systemBlob);

      // Generate filenames
      const microphoneFilename = `microphone_${timestamp}_${sessionId}.wav`;
      const systemFilename = `system_${timestamp}_${sessionId}.wav`;

      // Save recordings
      const microphoneUrl = await saveAudioFile(microphoneWavBlob, microphoneFilename);
      const systemUrl = await saveAudioFile(systemWavBlob, systemFilename);

      // Combine audio streams
      let combinedUrl: string | null = null;
      try {
        const combinedBlob = await combineAudioStreams(microphoneWavBlob, systemWavBlob, 'wav');
        if (combinedBlob) {
          const combinedFilename = `combined_${timestamp}_${sessionId}.wav`;
          combinedUrl = await saveAudioFile(combinedBlob, combinedFilename);
        }
      } catch (error) {
        console.error('Error combining audio streams:', error);
      }

      // Reset state
      setIsProcessing(false);
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
      setIsProcessing(false);
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
          variant={isRecording ? "destructive" : isProcessing ? "outline" : "default"}
          className={`gap-2 ${isRecording || isProcessing ? 'animate-pulse' : ''}`}
          size="lg"
          disabled={isProcessing}
        >
          <Image
            src={isProcessing ? "/globe.svg" : "/microphone.svg"}
            width={24}
            height={24}
            alt={isProcessing ? "Processing" : "Microphone"}
            className={`${isRecording || isProcessing ? 'animate-pulse' : ''}`}
          />
          <span>
            {isRecording ? 'Stop Recording' : 
             isProcessing ? 'Processing...' : 
             'Start Recording'}
          </span>
        </Button>

        {isRecording && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-lg">{formatDuration(duration)}</span>
          </div>
        )}
        
        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="font-mono text-lg">Processing audio...</span>
          </div>
        )}
      </div>
    </div>
  );
};