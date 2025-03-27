'use client';

import React, { useRef, useState, useEffect } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  isProcessing: boolean;
  microphoneStream?: MediaStream | null; // Add prop for actual microphone stream
  systemStream?: MediaStream | null; // Add prop for actual system stream
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  isProcessing,
  microphoneStream,
  systemStream
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // References to Audio API objects
  const audioContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const sysAnalyserRef = useRef<AnalyserNode | null>(null);
  const micDataRef = useRef<Uint8Array | null>(null);
  const sysDataRef = useRef<Uint8Array | null>(null);

  // Setup audio analyzers when streams are available
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    // Create audio context if not exists
    if (!audioContextRef.current && typeof window !== 'undefined') {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Clean up previous analyzers
    if (micAnalyserRef.current) {
      micAnalyserRef.current = null;
    }
    if (sysAnalyserRef.current) {
      sysAnalyserRef.current = null;
    }

    // Setup microphone analyzer
    if (microphoneStream && microphoneStream.active) {
      const micAnalyser = audioContext.createAnalyser();
      micAnalyser.fftSize = 256;
      const micBufferLength = micAnalyser.frequencyBinCount;
      const micDataArray = new Uint8Array(micBufferLength);
      
      const micSource = audioContext.createMediaStreamSource(microphoneStream);
      micSource.connect(micAnalyser);
      
      micAnalyserRef.current = micAnalyser;
      micDataRef.current = micDataArray;
    }

    // Setup system audio analyzer
    if (systemStream && systemStream.active) {
      const sysAnalyser = audioContext.createAnalyser();
      sysAnalyser.fftSize = 256;
      const sysBufferLength = sysAnalyser.frequencyBinCount;
      const sysDataArray = new Uint8Array(sysBufferLength);
      
      const sysSource = audioContext.createMediaStreamSource(systemStream);
      sysSource.connect(sysAnalyser);
      
      sysAnalyserRef.current = sysAnalyser;
      sysDataRef.current = sysDataArray;
    }

    // Cleanup function
    return () => {
      // We don't close the AudioContext here as it might be needed for future recordings
      // Just disconnect the sources if needed
    };
  }, [isRecording, microphoneStream, systemStream]);

  // Canvas animation for waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const updateCanvasSize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    const drawWaveform = () => {
      if (!ctx || !canvas) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (isRecording) {
        // Draw microphone waveform
        if (micAnalyserRef.current && micDataRef.current) {
          // Get actual audio data
          micAnalyserRef.current.getByteTimeDomainData(micDataRef.current);
          drawAudioWaveform(
            ctx,
            canvas.width,
            canvas.height,
            micDataRef.current,
            'rgba(220, 38, 38, 0.7)', // Red for microphone
            canvas.height / 2 - 20, // Slightly above center
            1 // Line width
          );
        } else {
          // Fallback to animated wave if no data
          drawAnimatedWave(
            ctx, 
            canvas.width, 
            canvas.height, 
            Date.now() / 1000, 
            canvas.height / 8, 
            'rgba(220, 38, 38, 0.7)', // Red
            35, // Higher frequency 
            canvas.height / 2 - 20
          );
        }
        
        // Draw system audio waveform
        if (sysAnalyserRef.current && sysDataRef.current) {
          // Get actual audio data
          sysAnalyserRef.current.getByteTimeDomainData(sysDataRef.current);
          drawAudioWaveform(
            ctx,
            canvas.width,
            canvas.height,
            sysDataRef.current,
            'rgba(59, 130, 246, 0.6)', // Blue for system audio
            canvas.height / 2 + 20, // Slightly below center
            1 // Line width
          );
        } else {
          // Fallback to animated wave if no data
          drawAnimatedWave(
            ctx, 
            canvas.width, 
            canvas.height, 
            Date.now() / 1000 * 0.7, 
            canvas.height / 10, 
            'rgba(59, 130, 246, 0.6)', // Blue
            20, // Lower frequency
            canvas.height / 2 + 20
          );
        }
      } else {
        // Draw flat line when not recording
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      
      // Continue animation
      if (isRecording) {
        animationRef.current = requestAnimationFrame(drawWaveform);
      }
    };
    
    // Function to draw actual audio waveform from audio data
    const drawAudioWaveform = (
      context: CanvasRenderingContext2D,
      width: number,
      height: number,
      dataArray: Uint8Array,
      color: string,
      yOffset: number,
      lineWidth: number
    ) => {
      context.beginPath();
      
      const sliceWidth = width / dataArray.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0; // Convert byte data to range ~0-2
        const y = v * height / 8; // Scale the waveform
        
        if (i === 0) {
          context.moveTo(x, yOffset + y);
        } else {
          context.lineTo(x, yOffset + y);
        }
        
        x += sliceWidth;
      }
      
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.stroke();
    };
    
    // Function to draw an animated wave (fallback)
    const drawAnimatedWave = (
      context: CanvasRenderingContext2D,
      width: number,
      height: number,
      time: number,
      amplitude: number,
      color: string,
      frequency: number,
      yOffset: number
    ) => {
      context.beginPath();
      
      for (let x = 0; x < width; x++) {
        // Add some randomness to make it look more natural
        const randomFactor = isRecording ? Math.random() * 0.15 : 0;
        
        // Calculate y position using sine function
        const y = Math.sin(x / frequency + time) * amplitude * (0.8 + randomFactor);
        
        if (x === 0) {
          context.moveTo(x, yOffset + y);
        } else {
          context.lineTo(x, yOffset + y);
        }
      }
      
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
    };
    
    // Start the animation
    if (isRecording) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    } else {
      drawWaveform(); // Draw flat line
    }
    
    // Mark as initialized
    setIsInitialized(true);
    
    // Cleanup animation on component unmount
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationRef.current);
      
      // Clean up audio context if needed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        // We don't close it here to avoid issues with reusing it
        // audioContextRef.current.close();
      }
    };
  }, [isRecording, microphoneStream, systemStream]);

  return (
    <div className="flex flex-col">
      <h4 className="text-sm font-medium mb-3 text-center">Live Audio Waveform</h4>
      
      <div className={`relative rounded-lg overflow-hidden border border-border/30
        h-24 ${isRecording ? 'bg-black/5' : 'bg-muted/30'}`}>
        
        {/* Canvas for waveform visualization */}
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
        />
        
        {/* Empty state message */}
        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-sm text-muted-foreground/50">
              {isInitialized ? 'Ready to record' : 'Initializing...'}
            </div>
          </div>
        )}
        
        {/* Processing state overlay */}
        <div className={`absolute inset-0 flex items-center justify-center bg-primary/5 transition-opacity duration-300 
          ${isProcessing ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
        
        {/* Color legend */}
        {isRecording && (
          <div className="absolute bottom-2 right-2 flex items-center gap-4 text-xs px-2 py-1 bg-black/10 rounded-full">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs">Mic</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-xs">System</span>
            </div>
          </div>
        )}
        
        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-destructive/10 rounded-full">
            <div className="w-1.5 h-1.5 bg-destructive rounded-full animate-pulse" />
            <span className="text-xs font-medium text-destructive">LIVE</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-between text-xs text-muted-foreground px-1">
        <span>Microphone + System Audio</span>
        <span>WAV · 48kHz</span>
      </div>
    </div>
  );
};
