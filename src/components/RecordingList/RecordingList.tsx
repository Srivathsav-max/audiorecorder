'use client';

import React, { useState } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
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
    <div className={`space-y-4 mt-8 ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Recorded Sessions</h2>
      
      {recordings.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            No recordings available. Start recording to see your sessions here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording, index) => (
            <Card key={`${recording.timestamp}-${index}`}>
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="p-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <CardTitle className="text-sm font-medium">
                          {formatTimestamp(recording.timestamp)}
                        </CardTitle>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                        {recording.format.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(index, e);
                          toast.success("Recording removed successfully");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {expandedIndices.includes(index) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pb-4 px-4 pt-0">
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
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
