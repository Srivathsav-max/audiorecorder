'use client';

import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  /**
   * URL of the audio file to play
   */
  src: string;
  
  /**
   * Label for the audio player
   */
  label: string;
  
  /**
   * Custom class name for the component
   */
  className?: string;
}

/**
 * AudioPlayer component for playing recorded audio
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  label,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle audio metadata loaded
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  // Handle audio error
  const handleError = () => {
    setError('Failed to load audio file');
    setIsLoading(false);
  };

  // Handle play/pause toggle
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Handle seeking
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Update play state when audio ends
  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      setCurrentTime(0);
    }
  };

  // Download audio file
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = label.replace(/\s+/g, '_').toLowerCase() + '.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`audio-player ${className}`}>
      <div className="audio-player-header">
        <h3 className="audio-player-label">{label}</h3>
        <button 
          className="download-button"
          onClick={handleDownload}
          aria-label="Download audio"
        >
          Download
        </button>
      </div>
      
      {isLoading ? (
        <div className="loading-indicator">Loading audio...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="audio-player-controls">
          <button 
            onClick={togglePlayPause}
            className="play-pause-button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❚❚' : '▶'}
          </button>
          
          <div className="time-display current-time">{formatTime(currentTime)}</div>
          
          <input 
            type="range"
            className="seek-slider"
            min={0}
            max={duration}
            value={currentTime}
            step={0.1}
            onChange={handleSeek}
          />
          
          <div className="time-display duration">{formatTime(duration)}</div>
        </div>
      )}
      
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleAudioEnded}
        onError={handleError}
        preload="metadata"
      />
      
      <style jsx>{`
        .audio-player {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          background-color: #f9f9f9;
          margin-bottom: 15px;
        }
        
        .audio-player-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .audio-player-label {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        .download-button {
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .download-button:hover {
          background-color: #3b7dce;
        }
        
        .audio-player-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .play-pause-button {
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
        }
        
        .play-pause-button:hover {
          background-color: #3b7dce;
        }
        
        .seek-slider {
          flex: 1;
          height: 5px;
        }
        
        .time-display {
          font-family: monospace;
          font-size: 14px;
          min-width: 45px;
        }
        
        .current-time {
          text-align: right;
        }
        
        .duration {
          text-align: left;
        }
        
        .loading-indicator {
          padding: 10px;
          text-align: center;
          color: #666;
        }
        
        .error-message {
          padding: 10px;
          text-align: center;
          color: #cc0000;
          background-color: #fff5f5;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
