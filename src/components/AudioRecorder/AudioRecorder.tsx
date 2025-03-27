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

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingStart,
  onRecordingStop,
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [microphoneStream, setMicrophoneStream] = useState<MediaStream | null>(null);
  const [systemStream, setSystemStream] = useState<MediaStream | null>(null);
  const [duration, setDuration] = useState<number>(0);

  // References for audio recording
  const sessionIdRef = useRef<string>('');
  const microphoneChunksRef = useRef<Blob[]>([]);
  const systemChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number | null>(null);

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

  // Start recording
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

      // Request system audio access
      const sysStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          sampleSize: 24
        },
      });
      
      // Remove video tracks
      sysStream.getVideoTracks().forEach(track => track.stop());
      
      // Create audio-only stream
      const systemAudioStream = new MediaStream();
      sysStream.getAudioTracks().forEach(track => systemAudioStream.addTrack(track));
      setSystemStream(systemAudioStream);

      // Set up recorders
      const microphoneRecorder = new MediaRecorder(micStream, {
        mimeType: 'audio/webm;codecs=pcm',
        audioBitsPerSecond: 256000
      });
      microphoneRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          microphoneChunksRef.current.push(event.data);
        }
      };

      const systemRecorder = new MediaRecorder(systemAudioStream, {
        mimeType: 'audio/webm;codecs=pcm',
        audioBitsPerSecond: 256000
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
      
      if (onRecordingStart) {
        onRecordingStart();
      }

      toast.success("Recording started");
    } catch (error) {
      console.error('Error starting recording:', error);
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
  }, [onRecordingStart]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (!startTimeRef.current) {
        throw new Error('Invalid recording state');
      }

      setIsRecording(false);
      setIsProcessing(true);
      toast.info("Processing audio recording...");

      // Stop streams
      microphoneStream?.getTracks().forEach(track => track.stop());
      systemStream?.getTracks().forEach(track => track.stop());

      // Create blobs
      const timestamp = getFormattedDateTime();
      const sessionId = sessionIdRef.current;
      
      const microphoneBlob = new Blob(microphoneChunksRef.current);
      const systemBlob = new Blob(systemChunksRef.current);
      
      const microphoneWavBlob = await convertToHighQualityWav(microphoneBlob);
      const systemWavBlob = await convertToHighQualityWav(systemBlob);

      // Save recordings
      const microphoneFilename = `microphone_${timestamp}_${sessionId}.wav`;
      const systemFilename = `system_${timestamp}_${sessionId}.wav`;
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

      // Create result
      const recordings: RecordedAudio = {
        microphoneAudio: microphoneUrl,
        systemAudio: systemUrl,
        combinedAudio: combinedUrl,
        timestamp: Date.now(),
        format: 'wav'
      };

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
    }
  }, [microphoneStream, systemStream, onRecordingStop]);

  // Toggle recording
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

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrowserSupport(checkBrowserSupport());
    }
  }, []);

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
    <div className={`${className}`}>
      <div className="relative flex flex-col items-center justify-center p-12 overflow-hidden rounded-2xl bg-gradient-to-b from-background to-secondary/10">
        {/* Ambient Glow Effect */}
        <div 
          className={`absolute inset-0 blur-3xl transition-opacity duration-1000 ${
            isRecording ? 'opacity-20' : 'opacity-0'
          }`}
          style={{
            background: isRecording 
              ? 'radial-gradient(circle at center, rgb(239, 68, 68), transparent 70%)'
              : 'radial-gradient(circle at center, rgb(59, 130, 246), transparent 70%)'
          }}
        />

        {/* Main Recording Button */}
        <div className="relative mb-8">
          <Button
            onClick={toggleRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className={`
              h-24 w-24 rounded-full p-0 relative
              shadow-lg hover:shadow-xl transition-all duration-500
              ${isRecording ? 'animate-pulse shadow-red-500/20' : ''}
              ${isProcessing ? 'animate-pulse shadow-blue-500/20' : ''}
            `}
            disabled={isProcessing}
          >
            <div className={`
              absolute inset-0 rounded-full opacity-20 transition-all duration-500
              ${isRecording 
                ? 'bg-gradient-to-tr from-red-500 to-red-500/80' 
                : 'bg-gradient-to-tr from-primary to-primary/80'
              }
            `} />
            <Image
              src={isProcessing ? "/globe.svg" : "/microphone.svg"}
              width={32}
              height={32}
              alt={isProcessing ? "Processing" : "Microphone"}
              className={`transition-transform duration-500 ${isRecording ? 'scale-90' : 'scale-100'}`}
            />
          </Button>

          {/* Recording Status */}
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
            {isRecording ? (
              <div className="flex items-center gap-3 bg-destructive/10 px-4 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <span className="font-mono text-base font-medium text-destructive">
                  {formatDuration(duration)}
                </span>
              </div>
            ) : isProcessing ? (
              <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-full">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-mono text-base font-medium text-primary">
                  Processing...
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                Click to start recording
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
