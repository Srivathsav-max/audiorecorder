'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AudioRecorderProps, RecordedAudio, AudioDevice } from './types';
import { DeviceSelector } from './DeviceSelector';
import { WaveformVisualizer } from './WaveformVisualizer';
import {
  getFormattedDateTime,
  createSessionId,
  combineAudioStreams,
  checkBrowserSupport,
  convertToHighQualityWav
} from './utils';
import { saveRecordingToAppwrite } from './appwrite-utils';

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
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedMicrophoneId, setSelectedMicrophoneId] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('selectedMicrophoneId') || 'default' : 'default'
  );

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

  // Fetch available audio devices
  const fetchAudioDevices = async () => {
    try {
      // Force request permission to ensure we get device labels
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Permission granted for microphone');
      } catch (permissionError) {
        console.error('Microphone permission error:', permissionError);
        toast.error('Please allow microphone access to see devices');
        return;
      }
      
      // Now that we have permission, enumerate all devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
      
      const mappedDevices = audioInputs.map(device => ({
        id: device.deviceId,
        label: device.label || `Microphone (${device.deviceId.substring(0, 8)}...)`,
        kind: device.kind
      }));

      if (mappedDevices.length > 0) {
        setAudioDevices(mappedDevices);
        
        // Set first device only if no device is selected
        if (!localStorage.getItem('selectedMicrophoneId') && mappedDevices.length > 0) {
          setSelectedMicrophoneId(mappedDevices[0].id);
          localStorage.setItem('selectedMicrophoneId', mappedDevices[0].id);
        }
        
        toast.success(`Found ${mappedDevices.length} audio devices`);
      } else {
        toast.warning('No audio input devices detected');
      }
      
      // Always stop the temporary stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (error) {
      console.error('Error fetching audio devices:', error);
      toast.error('Unable to access audio devices');
    }
  };

  // Handle microphone selection change
  const handleMicrophoneChange = useCallback((deviceId: string) => {
    if (isRecording || isProcessing) {
      toast.error('Cannot change microphone while recording or processing');
      return;
    }
    
    // Stop any existing streams
    if (microphoneStream) {
      microphoneStream.getTracks().forEach(track => track.stop());
      setMicrophoneStream(null);
    }
    
    // Update selected device and persist to localStorage
    setSelectedMicrophoneId(deviceId);
    localStorage.setItem('selectedMicrophoneId', deviceId);
  }, [isRecording, isProcessing, microphoneStream]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      sessionIdRef.current = createSessionId();
      microphoneChunksRef.current = [];
      systemChunksRef.current = [];

      // Request microphone access with high-quality audio settings
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: selectedMicrophoneId },
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
  }, [onRecordingStart, selectedMicrophoneId]);

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
      const sessionId = sessionIdRef.current;
      const microphoneBlob = new Blob(microphoneChunksRef.current);
      const systemBlob = new Blob(systemChunksRef.current);

      const microphoneWavBlob = await convertToHighQualityWav(microphoneBlob);
      const systemWavBlob = await convertToHighQualityWav(systemBlob);

      // Combine audio streams
      let combinedWavBlob: Blob | null = null;
      try {
        combinedWavBlob = await combineAudioStreams(microphoneWavBlob, systemWavBlob, 'wav');
        if (!combinedWavBlob) {
          throw new Error('Failed to create combined audio');
        }
      } catch (error) {
        console.error('Error combining audio streams:', error);
        toast.error('Could not create combined audio stream');
      }

      // Save to Appwrite
      try {
        const result = await saveRecordingToAppwrite(
          sessionId,
          microphoneWavBlob,
          systemWavBlob,
          combinedWavBlob
        );

        // Create result
        const recordings: RecordedAudio = {
          microphoneAudio: result.microphoneAudioUrl,
          systemAudio: result.systemAudioUrl,
          combinedAudio: result.combinedAudioUrl,
          timestamp: Date.now(),
          format: 'wav',
          documentId: result.documentId
        };

        if (onRecordingStop) {
          onRecordingStop(recordings);
        }

        toast.success("Recording saved to Appwrite");
        return recordings;
      } catch (error) {
        console.error('Error saving to Appwrite:', error);
        toast.error('Failed to save recording to Appwrite');
      } finally {
        // Reset state
        setIsProcessing(false);
        setMicrophoneStream(null);
        setSystemStream(null);
        startTimeRef.current = null;
        setDuration(0);
      }
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
  
  // Load audio devices on component mount and setup device change listener
  useEffect(() => {
    fetchAudioDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      console.log('Device change detected');
      fetchAudioDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
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
      <div className="p-4 text-red-800 bg-red-50 rounded-lg shadow-sm">
        <p className="font-medium mb-2">Your browser doesn't support audio recording</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>MediaRecorder API: {browserSupport.mediaRecorderSupported ? '✓' : '✗'}</li>
          <li>Microphone Access: {browserSupport.microphoneSupported ? '✓' : '✗'}</li>
          <li>Screen Capture: {browserSupport.screenCaptureSupported ? '✓' : '✗'}</li>
        </ul>
        <p className="mt-2 text-sm">Please use Chrome, Edge, or Firefox for best results.</p>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Main Content Area */}
      <div className="p-6">
          {/* Device Selection */}
          <div className="mb-6">
            <DeviceSelector
              audioDevices={audioDevices}
              selectedDeviceId={selectedMicrophoneId}
              onDeviceChange={handleMicrophoneChange}
              onRefreshDevices={fetchAudioDevices}
              disabled={isRecording || isProcessing}
            />
          </div>

          {/* Recording Status */}
          <div className="flex justify-center mb-8">
            {isRecording && (
              <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-full">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                <span className="font-mono text-sm font-medium text-destructive">
                  {formatDuration(duration)}
                </span>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="font-mono text-sm font-medium text-primary">Processing</span>
              </div>
            )}
            
            {!isRecording && !isProcessing && (
              <div className="px-4 py-2 bg-muted/50 rounded-full">
                <span className="text-sm text-muted-foreground">Ready to record</span>
              </div>
            )}
          </div>

          {/* Record Button */}
          <div className="flex justify-center">
            <Button
              onClick={toggleRecording}
              variant={isRecording ? "destructive" : "default"}
              size="lg"
              className={`
                h-24 w-24 rounded-full p-0
                relative transition-all duration-300
                ${isRecording ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'}
                ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}
                shadow-md hover:shadow-lg
              `}
              disabled={isProcessing}
            >
              <div className="flex flex-col items-center justify-center">
                {isRecording ? (
                  <div className="w-8 h-8 rounded bg-white" />
                ) : (
                  <div className="relative">
                    <Image 
                      src="/microphone.svg" 
                      width={28} 
                      height={28} 
                      alt="Microphone"
                      className="text-background"
                    />
                  </div>
                )}
                <span className="text-xs mt-1 text-background font-medium">
                  {isRecording ? 'Stop' : 'Record'}
                </span>
              </div>
            </Button>
          </div>
          
          {/* Live Waveform Visualization */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <WaveformVisualizer
              isRecording={isRecording}
              isProcessing={isProcessing}
              deviceId={selectedMicrophoneId}
              microphoneStream={microphoneStream}
              systemStream={systemStream}
            />
          </div>
      </div>
    </div>
  );
};
