'use client';

import React, { useState } from 'react';
import { AudioRecorder } from '../AudioRecorder';
import { RecordingList } from '../RecordingList';
import { RecordedAudio } from '../AudioRecorder/types';
import { Card, CardContent } from '@/components/ui/card';
import { useRecordings } from '@/lib/useRecordings';
import Image from 'next/image';

interface DualAudioRecorderProps {
  /**
   * Custom class name for the component
   */
  className?: string;
}

/**
 * Main container component for the dual audio recording system
 */
export const DualAudioRecorder: React.FC<DualAudioRecorderProps> = ({
  className = '',
}) => {
  // Use our custom hook to manage recordings from the server
  const { 
    recordings, 
    loading, 
    error, 
    fetchRecordings, 
    addRecording, 
    deleteRecording 
  } = useRecordings();
  
  const [isRecording, setIsRecording] = useState(false);

  // Handler for when recording starts
  const handleRecordingStart = () => {
    setIsRecording(true);
  };

  // Handler for when recording stops
  const handleRecordingStop = (newRecording: RecordedAudio) => {
    setIsRecording(false);
    
    // Add the new recording to our list
    addRecording(newRecording);
  };

  // Handler for removing a recording
  const handleRemoveRecording = (index: number) => {
    deleteRecording(index);
  };

  return (
    <div className={`max-w-4xl mx-auto p-5 sm:p-8 ${className}`}>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-primary/5 to-background rounded-2xl p-8 mb-12">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(white,transparent_70%)] rounded-2xl" />
        
        <div className="relative flex flex-col items-center text-center">
          <Image
            src="/watchrx-logo-new.png"
            alt="WatchRX Logo"
            width={200}
            height={60}
            className="mb-6 drop-shadow-sm"
            priority
          />
          
          <h1 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            Healthcare Communication Recorder
          </h1>
          
          <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
            Enterprise-grade dual audio capture system designed for healthcare professionals.
            Securely records and archives communication sessions with integrated system and microphone audio.
          </p>
        </div>
      </div>

      {/* Recorder Section */}
      <Card className="mb-12 border-2 shadow-lg">
        <CardContent className="p-8">
          <AudioRecorder
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
          />
        </CardContent>
      </Card>

      {/* Recordings Section */}
      <div className="space-y-6">
        <RecordingList
          recordings={recordings}
          onRemoveRecording={handleRemoveRecording}
          isLoading={loading}
          error={error}
          onRetry={fetchRecordings}
        />
      </div>
    </div>
  );
};
