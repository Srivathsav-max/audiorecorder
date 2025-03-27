'use client';

import React, { useState } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Trash2, Clock, Calendar } from "lucide-react";
import { AudioPlayer } from '../AudioPlayer';
import { RecordedAudio } from '../AudioRecorder/types';
import Image from 'next/image';

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
  
  /**
   * Loading state
   */
  isLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * Retry function for loading recordings
   */
  onRetry?: () => void;
}

/**
 * RecordingList component for displaying and managing recorded audio files
 */
export const RecordingList: React.FC<RecordingListProps> = ({
  recordings,
  onRemoveRecording,
  className = '',
  isLoading = false,
  error = null,
  onRetry,
}) => {
  // State to track expanded recording details
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  // Format timestamp to readable date string
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Format date only
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  // Format time only
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
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
    <div className={`space-y-6 mt-8 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Image src="/file.svg" width={20} height={20} alt="Files" />
        </span>
        <h2 className="text-xl font-semibold">Recorded Sessions</h2>
      </div>

      {isLoading ? (
        <Card className="border-2">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center animate-pulse">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Loading recordings...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-2 border-destructive/20">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="text-destructive font-medium">{error}</p>
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="mt-2"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : recordings.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-muted-foreground">No recordings available</p>
                <p className="text-sm text-muted-foreground/60">
                  Start recording to see your sessions here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {recordings.map((recording, index) => (
            <Card
              key={`${recording.timestamp}-${index}`}
              className="transition-all hover:shadow-lg overflow-hidden border-2 hover:border-primary/20"
            >
              <Collapsible>
                <div className="flex items-center justify-between w-full gap-4 p-4 bg-secondary/5 hover:bg-secondary/10 transition-colors rounded-t-lg">
                  <CollapsibleTrigger className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDate(recording.timestamp)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatTime(recording.timestamp)}</span>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                        {recording.format.toUpperCase()}
                      </span>
                      {expandedIndices.includes(index) ? (
                        <ChevronUp className="h-4 w-4 ml-2 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
                      )}
                    </div>
                  </CollapsibleTrigger>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 px-2 shrink-0 opacity-80 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index, e);
                      toast.success("Recording removed successfully");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <CollapsibleContent>
                  <div className="p-6 space-y-6 bg-background/50">
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
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
