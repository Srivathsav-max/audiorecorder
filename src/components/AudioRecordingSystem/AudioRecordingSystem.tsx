'use client';

import React, { useState } from 'react';
import { AudioRecorder, RecordingsList } from '@/components/AudioRecorder';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';

interface AudioRecordingSystemProps {
  className?: string;
}

export const AudioRecordingSystem: React.FC<AudioRecordingSystemProps> = ({
  className = '',
}) => {
  const [refresh, setRefresh] = useState<number>(0);

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
    setRefresh(prev => prev + 1);
  };

  const handleRefresh = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <div className={`${className}`}>
      {/* Recorder Section */}
        <AudioRecorder
          onRecordingStart={handleRecordingStart}
          onRecordingStop={handleRecordingStop}
        />
      
      {/* Recordings List Section */}
      <RecordingsList onRefresh={handleRefresh} />
    </div>
  );
};
