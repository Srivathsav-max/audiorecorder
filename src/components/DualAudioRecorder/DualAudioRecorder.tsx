'use client';

import React, { useState, useEffect } from 'react';
import { AudioRecorder } from '../AudioRecorder';
import { RecordingList } from '../RecordingList';
import { RecordedAudio } from '../AudioRecorder/types';
import { Card, CardContent } from '@/components/ui/card';
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
  // State to store recordings
  const [recordings, setRecordings] = useState<RecordedAudio[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  
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
    <div className={`max-w-3xl mx-auto p-5 sm:p-8 ${className}`}>
      <div className="flex justify-center mb-8">
        <Image
          src="/watchrx-logo-new.png"
          alt="WatchRX Logo"
          width={200}
          height={60}
          className="mb-6"
          priority
        />
      </div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-3">Healthcare Communication Recorder</h1>
        <p className="text-gray-600 text-base leading-relaxed">
          Enterprise-grade dual audio capture system designed for healthcare professionals. 
          Securely records and archives communication sessions with integrated system and microphone audio.
        </p>
      </div>
      
      <Card className="mb-8">
        <CardContent className="p-6">
          <AudioRecorder 
            onRecordingStart={handleRecordingStart}
            onRecordingStop={handleRecordingStop}
          />
        </CardContent>
      </Card>
      
      <div className="mt-8">
        <RecordingList 
          recordings={recordings}
          onRemoveRecording={handleRemoveRecording}
        />
      </div>
    </div>
  );
};
