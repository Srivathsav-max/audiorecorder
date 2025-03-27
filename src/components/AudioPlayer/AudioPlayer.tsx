'use client';

import React, { useState, useRef, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WaveSurfer from 'wavesurfer.js/dist/wavesurfer.js';
import { Play, Pause, Download } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  label: string;
  className?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  label,
  className = '',
}) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#94a3b8',
      progressColor: '#4a90e2',
      cursorWidth: 2,
      cursorColor: '#2d3748',
      height: 64,
      normalize: true,
      fillParent: true,
      autoCenter: true,
      minPxPerSec: 50,
      backend: 'WebAudio',
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      setIsLoading(false);
      setIsReady(true);
      toast.success('Audio loaded successfully');
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('timeupdate', time => setCurrentTime(time));
    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurfer.on('error', err => {
      console.error('WaveSurfer error:', err);
      setError('Failed to load audio file');
      setIsLoading(false);
      toast.error('Failed to load audio file');
    });

    // Load the audio
    wavesurfer.load(src);

    return () => {
      wavesurfer.destroy();
    };
  }, [src]);

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause();
      } else {
        wavesurferRef.current.play();
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = label.replace(/\s+/g, '_').toLowerCase() + '.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  return (
    <Card className={`mb-4 ${className}`}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{label}</CardTitle>
          <Button 
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
            disabled={!isReady}
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
              <div className="w-16 h-6 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="text-center text-gray-600 py-2">
              Preparing waveform visualization...
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 bg-red-50 py-2 rounded-md">{error}</div>
        ) : (
          <div className="space-y-4">
            <div ref={waveformRef} className="w-full rounded-lg overflow-hidden" />
            
            <div className="flex items-center justify-between">
              <Button 
                onClick={togglePlayPause}
                variant="secondary"
                size="icon"
                className="w-10 h-10 rounded-full"
                disabled={!isReady || !!error}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              
              <span className="font-mono text-sm">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
