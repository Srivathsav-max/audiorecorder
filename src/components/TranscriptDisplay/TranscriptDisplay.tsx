'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Search, Clock, ArrowDown } from "lucide-react";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { Badge } from "../../components/ui/badge";

// Define interfaces for transcript data
interface TranscriptSegment {
  end: number;
  start: number;
  speaker: string;
  transcription: string;
  language?: string;
  word_timestamps?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  language_probability?: number;
  label?: string;
  segment?: {
    start: number;
    end: number;
  };
}

export interface TranscriptData {
  segments: TranscriptSegment[];
  language?: string;
  duration?: number;
}

interface TranscriptDisplayProps {
  transcriptionData: TranscriptData | null;
  onTimeClick?: (time: number) => void;
  currentTime?: number;
  className?: string;
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcriptionData,
  onTimeClick,
  currentTime = 0,
  className,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredSegments, setFilteredSegments] = useState<TranscriptSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Format time function - converts seconds to MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Filter segments based on search term
  useEffect(() => {
    if (!transcriptionData?.segments) {
      setFilteredSegments([]);
      return;
    }

    if (!searchTerm.trim()) {
      setFilteredSegments(transcriptionData.segments);
      return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filtered = transcriptionData.segments.filter(segment =>
      segment.transcription.toLowerCase().includes(lowerCaseSearchTerm)
    );
    
    setFilteredSegments(filtered);
  }, [searchTerm, transcriptionData]);

  // Determine active segment based on current playback time
  useEffect(() => {
    if (!transcriptionData?.segments || currentTime <= 0) {
      setActiveSegmentIndex(null);
      return;
    }

    // Find the segment that contains the current playback time
    const activeIndex = transcriptionData.segments.findIndex(
      segment => currentTime >= segment.start && currentTime <= segment.end
    );
    
    setActiveSegmentIndex(activeIndex !== -1 ? activeIndex : null);
  }, [currentTime, transcriptionData]);

  // Scroll to active segment
  useEffect(() => {
    if (activeSegmentIndex !== null && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeSegmentIndex]);

  // Handle when no transcript data is available
  if (!transcriptionData?.segments || transcriptionData.segments.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
          <CardDescription>No transcript data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Group segments by speaker for better visualization
  const groupedSegments: { speaker: string; segments: TranscriptSegment[] }[] = [];
  
  filteredSegments.forEach((segment, index) => {
    if (index === 0 || segment.speaker !== filteredSegments[index - 1].speaker) {
      groupedSegments.push({
        speaker: segment.speaker,
        segments: [segment],
      });
    } else {
      groupedSegments[groupedSegments.length - 1].segments.push(segment);
    }
  });

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <CardTitle>Transcript</CardTitle>
          <div className="relative w-full sm:w-auto max-w-xs">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 w-full"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-6 max-h-[400px] overflow-y-auto p-1">
          {groupedSegments.map((group, groupIndex) => (
            <div 
              key={`group-${groupIndex}`} 
              className={cn(
                "flex flex-col",
                group.speaker.toLowerCase().includes('patient') 
                  ? "items-start" 
                  : "items-end"
              )}
            >
              <div className={cn(
                "flex flex-col max-w-[85%] gap-2",
                group.speaker.toLowerCase().includes('patient') 
                  ? "items-start" 
                  : "items-end"
              )}>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "mb-1",
                    group.speaker.toLowerCase().includes('patient') 
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                      : "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400"
                  )}
                >
                  {group.speaker}
                </Badge>
                
                {group.segments.map((segment, segmentIndex) => {
                  const isActive = filteredSegments.indexOf(segment) === activeSegmentIndex;
                  
                  return (
                    <div 
                      key={`segment-${groupIndex}-${segmentIndex}`}
                      ref={isActive ? activeSegmentRef : null}
                      className={cn(
                        "flex flex-col p-3 rounded-lg break-words transition-all",
                        group.speaker.toLowerCase().includes('patient')
                          ? "bg-blue-50 dark:bg-blue-900/10 rounded-bl-none" 
                          : "bg-violet-50 dark:bg-violet-900/10 rounded-br-none",
                        isActive && "ring-2 ring-primary"
                      )}
                    >
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-muted"
                          onClick={() => onTimeClick && onTimeClick(segment.start)}
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </span>
                      </div>
                      <p className="text-sm">
                        {searchTerm.trim() ? (
                          highlightSearchTerm(segment.transcription, searchTerm)
                        ) : (
                          segment.transcription
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Jump to active section button - only show when not in view */}
        {activeSegmentIndex !== null && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 mx-auto flex items-center gap-1"
            onClick={() => {
              if (activeSegmentRef.current) {
                activeSegmentRef.current.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                });
              }
            }}
          >
            <ArrowDown className="h-3 w-3 mr-1" />
            Jump to current section
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

// Utility function to highlight search terms in text
function highlightSearchTerm(text: string, searchTerm: string): React.ReactNode {
  if (!searchTerm.trim()) return text;
  
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return parts.map((part, index) => 
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <span key={index} className="bg-yellow-200 dark:bg-yellow-900/60">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export default TranscriptDisplay;
