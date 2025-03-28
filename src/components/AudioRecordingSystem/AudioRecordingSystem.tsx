'use client';

import React from 'react';
import { AudioRecorder } from '@/components/AudioRecorder';
import { RecordingsList } from '@/components/RecordingsList';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';
import { useRecordings } from '@/lib/useRecordings';

interface AudioRecordingSystemProps {
  className?: string;
}

export const AudioRecordingSystem: React.FC<AudioRecordingSystemProps> = ({
  className = '',
}) => {
  const { refresh } = useRecordings();

  const handleRecordingStart = () => {
    console.log('Recording started');
  };

  const handleRecordingStop = (recording: RecordedAudio) => {
    console.log('Recording saved:', recording);

    // Show more detailed success message
    if (recording.combinedAudio) {
      toast.success('All audio streams successfully saved!');
    } else {
      toast.success('Microphone and system audio saved!');
    }

    // Refresh the recordings list
    refresh();
  };

  return (
    <div className={`${className}`}>
      {/* Recorder Section */}
      <AudioRecorder
        onRecordingStart={handleRecordingStart}
        onRecordingStop={handleRecordingStop}
      />

      {/* Recordings List Section */}
      <RecordingsList onRefresh={refresh} />
    </div>
  );
};