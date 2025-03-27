'use client';

import React from 'react';
import { AudioRecorder, RecordingsList } from '@/components/AudioRecorder';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';

interface AudioRecordingSystemProps {
  className?: string;
}

export const AudioRecordingSystem: React.FC<AudioRecordingSystemProps> = ({
  className = '',
}) => {
  const handleRecordingStart = () => {
    console.log('Recording started');
  };

  const handleRecordingStop = (recording: RecordedAudio) => {
    console.log('Recording saved to Appwrite:', recording);
    
    // Show more detailed success message
    if (recording.combinedAudio) {
      toast.success('All audio streams successfully saved to Appwrite!');
    } else {
      toast.success('Microphone and system audio saved to Appwrite!');
    }
    
    // Trigger a refresh of recordings list
  };

  return (
    <div className={`${className}`}>
      {/* Recorder Section */}
        <AudioRecorder
          onRecordingStart={handleRecordingStart}
          onRecordingStop={handleRecordingStop}
        />
      
      {/* Recordings List Section */}
        <RecordingsList onRefresh={() => {}} />
    </div>
  );
};
