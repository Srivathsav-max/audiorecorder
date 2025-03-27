'use client';

import React, { useState, useEffect } from 'react';
import { AudioRecorder } from '../AudioRecorder';
import { RecordingList } from '../RecordingList';
import { RecordedAudio } from '../AudioRecorder/types';

interface DualAudioRecorderProps {
  /**
   * Default audio format
   * @default 'mp3'
   */
  defaultFormat?: 'mp3' | 'wav';
  
  /**
   * Custom class name for the component
   */
  className?: string;
}

/**
 * Main container component for the dual audio recording system
 */
export const DualAudioRecorder: React.FC<DualAudioRecorderProps> = ({
  defaultFormat = 'mp3',
  className = '',
}) => {
  // State to store recordings
  const [recordings, setRecordings] = useState<RecordedAudio[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFormat, setRecordingFormat] = useState<'mp3' | 'wav'>(defaultFormat);
  
  // Load saved recordings from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRecordings = localStorage.getItem('audioRecordings');
      if (savedRecordings) {
        try {
          setRecordings(JSON.parse(savedRecordings));
        } catch (error) {
          console.error('Error parsing saved recordings:', error);
        }
      }
    }
  }, []);
  
  // Save recordings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && recordings.length > 0) {
      localStorage.setItem('audioRecordings', JSON.stringify(recordings));
    }
  }, [recordings]);
  
  // Handler for when recording starts
  const handleRecordingStart = () => {
    setIsRecording(true);
  };
  
  // Handler for when recording stops
  const handleRecordingStop = (newRecording: RecordedAudio) => {
    setIsRecording(false);
    setRecordings(prev => [newRecording, ...prev]);
  };
  
  // Handler for removing a recording
  const handleRemoveRecording = (index: number) => {
    setRecordings(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <div className={`dual-audio-recorder ${className}`}>
      <div className="recorder-header">
        <h1>Nurse-Patient Call Recording</h1>
        <p className="description">
          Record both microphone and system audio for nurse-patient calls.
          The recordings will be saved for government record purposes.
        </p>
      </div>
      
      <div className="recorder-section">
        <AudioRecorder 
          onRecordingStart={handleRecordingStart}
          onRecordingStop={handleRecordingStop}
          format={recordingFormat}
        />
      </div>
      
      <div className="format-settings">
        <h2>Recording Settings</h2>
        <div className="format-selector">
          <label htmlFor="format-setting">Default Format:</label>
          <select 
            id="format-setting"
            value={recordingFormat}
            onChange={(e) => setRecordingFormat(e.target.value as 'mp3' | 'wav')}
            disabled={isRecording}
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </div>
        <div className="format-info">
          <p>MP3: Smaller file size, good for archiving</p>
          <p>WAV: Higher quality, uncompressed audio</p>
        </div>
      </div>
      
      <div className="recordings-section">
        <RecordingList 
          recordings={recordings}
          onRemoveRecording={handleRemoveRecording}
        />
      </div>
      
      <style jsx>{`
        .dual-audio-recorder {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .recorder-header {
          margin-bottom: 30px;
          text-align: center;
        }
        
        .recorder-header h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .description {
          color: #666;
          font-size: 16px;
          line-height: 1.4;
        }
        
        .recorder-section {
          margin-bottom: 30px;
        }
        
        .format-settings {
          background-color: #f5f5f5;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .format-settings h2 {
          font-size: 18px;
          margin-bottom: 15px;
        }
        
        .format-selector {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .format-selector select {
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #ddd;
        }
        
        .format-info {
          color: #666;
          font-size: 14px;
        }
        
        .format-info p {
          margin: 5px 0;
        }
        
        .recordings-section {
          margin-top: 30px;
        }
        
        @media (max-width: 600px) {
          .dual-audio-recorder {
            padding: 15px;
          }
          
          .recorder-header h1 {
            font-size: 20px;
          }
          
          .format-settings {
            padding: 15px;
          }
        }
      `}</style>
    </div>
  );
};
