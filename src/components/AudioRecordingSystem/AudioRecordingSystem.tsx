'use client';

import React from 'react';
import { AudioRecorder } from '@/components/AudioRecorder';
import { RecordingsList } from '@/components/RecordingsList';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';
import { useRecordings } from '@/lib/useRecordings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, ListMusic } from 'lucide-react';

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

    // Show success message
    if (recording.combinedAudio) {
      toast.success('All audio streams successfully saved!', {
        description: 'Microphone, system, and combined audio saved successfully.'
      });
    } else {
      toast.success('Audio saved successfully!', {
        description: 'Microphone and system audio saved successfully.'
      });
    }

    // Refresh the recordings list
    refresh();
  };

  return (
    <div className={`${className}`}>
      <Tabs defaultValue="recorder" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="recorder" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Recorder</span>
          </TabsTrigger>
          <TabsTrigger value="recordings" className="flex items-center gap-2">
            <ListMusic className="h-4 w-4" />
            <span>Recordings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="recorder">
          <Card>
            <CardHeader>
              <CardTitle>Audio Recorder</CardTitle>
              <CardDescription>
                Record both microphone and system audio simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AudioRecorder
                onRecordingStart={handleRecordingStart}
                onRecordingStop={handleRecordingStop}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recordings">
          <Card>
            <CardHeader>
              <CardTitle>Your Recordings</CardTitle>
              <CardDescription>
                Access and manage your saved recordings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecordingsList onRefresh={refresh} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};