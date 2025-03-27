'use client';

import React, { useState, useEffect } from 'react';
import { AudioPlayer } from '../AudioPlayer';
import { RecordedAudio } from '../AudioRecorder/types';

interface RecordingListProps {
  /**
   * List of recorded audio items
   */
  recordings: RecordedAudio[];
  
  /**
   * Callback function to remove a recording
   */
  onRemoveRecording?: (index: number) => void;
  
  /**
   * Custom class name for the component
   */
  className?: string;
}

/**
 * RecordingList component for displaying and managing recorded audio files
 */
export const RecordingList: React.FC<RecordingListProps> = ({
  recordings,
  onRemoveRecording,
  className = '',
}) => {
  // State to track expanded recording details
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  // Format timestamp to readable date string
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Toggle expanded state for a recording
  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => 
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Handle removing a recording
  const handleRemove = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveRecording) {
      onRemoveRecording(index);
    }
  };

  return (
    <div className={`recording-list ${className}`}>
      <h2 className="recording-list-title">Recorded Sessions</h2>
      
      {recordings.length === 0 ? (
        <div className="no-recordings">
          No recordings available. Start recording to see your sessions here.
        </div>
      ) : (
        <div className="recordings-container">
          {recordings.map((recording, index) => (
            <div key={`${recording.timestamp}-${index}`} className="recording-item">
              <div 
                className="recording-header"
                onClick={() => toggleExpand(index)}
              >
                <div className="recording-info">
                  <span className="recording-timestamp">
                    {formatTimestamp(recording.timestamp)}
                  </span>
                  <span className="recording-format">
                    {recording.format.toUpperCase()}
                  </span>
                </div>
                
                <div className="recording-actions">
                  <button
                    className="remove-button"
                    onClick={(e) => handleRemove(index, e)}
                    aria-label="Remove recording"
                  >
                    Remove
                  </button>
                  <button
                    className="expand-button"
                    aria-label={expandedIndices.includes(index) ? 'Collapse' : 'Expand'}
                  >
                    {expandedIndices.includes(index) ? '▲' : '▼'}
                  </button>
                </div>
              </div>
              
              {expandedIndices.includes(index) && (
                <div className="recording-details">
                  {recording.microphoneAudio && (
                    <AudioPlayer 
                      src={recording.microphoneAudio} 
                      label="Microphone Audio" 
                    />
                  )}
                  
                  {recording.systemAudio && (
                    <AudioPlayer 
                      src={recording.systemAudio} 
                      label="System Audio" 
                    />
                  )}
                  
                  {recording.combinedAudio && (
                    <AudioPlayer 
                      src={recording.combinedAudio} 
                      label="Combined Audio" 
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .recording-list {
          margin-top: 30px;
        }
        
        .recording-list-title {
          font-size: 20px;
          margin-bottom: 15px;
        }
        
        .no-recordings {
          padding: 20px;
          text-align: center;
          background-color: #f5f5f5;
          border-radius: 8px;
          color: #666;
        }
        
        .recordings-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .recording-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .recording-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: #f5f5f5;
          cursor: pointer;
        }
        
        .recording-header:hover {
          background-color: #eaeaea;
        }
        
        .recording-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .recording-timestamp {
          font-weight: 500;
        }
        
        .recording-format {
          background-color: #4a90e2;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .recording-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .remove-button {
          background-color: #ff4b4b;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 5px 10px;
          font-size: 12px;
          cursor: pointer;
        }
        
        .remove-button:hover {
          background-color: #e04040;
        }
        
        .expand-button {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #666;
        }
        
        .recording-details {
          padding: 15px;
          background-color: #fff;
        }
      `}</style>
    </div>
  );
};
