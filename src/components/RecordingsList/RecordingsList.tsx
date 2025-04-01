'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AudioPlayer } from "../AudioPlayer";
import { toast } from 'sonner';
import { apiClient, Recording } from '@/lib/api-client';
import { getCookie, AUTH_COOKIE_NAME } from '@/lib/cookies';

interface RecordingsListProps {
  onRefresh?: () => void;
}

interface RecordingsResponse {
  recordings: Recording[];
  nextCursor: string | null;
}

// Type guard
function isValidRecordingsResponse(data: unknown): data is RecordingsResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'recordings' in data &&
    'nextCursor' in data &&
    Array.isArray((data as RecordingsResponse).recordings) &&
    ((data as RecordingsResponse).nextCursor === null || 
     typeof (data as RecordingsResponse).nextCursor === 'string')
  );
}

export const RecordingsList: React.FC<RecordingsListProps> = ({ onRefresh }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAudio, setSelectedAudio] = useState<{ url: string; label: string } | null>(null);
  const [generatingTranscript, setGeneratingTranscript] = useState<Record<string, boolean>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const limit = 10;

  // Format date from timestamp
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Fetch recordings from the API
  const fetchRecordings = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      
      const token = getCookie(AUTH_COOKIE_NAME);
      if (!token) {
        toast.error('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await apiClient.getRecordings({ 
        cursor,
        limit
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch recordings');
      }

      if (!isValidRecordingsResponse(response.data)) {
        throw new Error('Invalid response data format');
      }

      const { recordings: newRecordings, nextCursor: newCursor } = response.data;
      
      setRecordings(prevRecordings => cursor 
        ? [...prevRecordings, ...newRecordings] 
        : newRecordings
      );
      setNextCursor(newCursor);

    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed as apiClient and limit are stable

  // Load more recordings
  const loadMore = () => {
    if (nextCursor) {
      fetchRecordings(nextCursor);
    }
  };

  // Delete recording
  const handleDelete = async (id: string) => {
    try {
      // Close dialog if the deleted recording is currently selected
      const recordingToDelete = recordings.find(rec => rec.id === id);
      if (selectedAudio && recordingToDelete) {
        if (
          selectedAudio.url === recordingToDelete.microphoneAudio ||
          selectedAudio.url === recordingToDelete.systemAudio ||
          (recordingToDelete.combinedAudio && selectedAudio.url === recordingToDelete.combinedAudio)
        ) {
          setSelectedAudio(null);
        }
      }

      // Call API to delete recording
      const deletePromise = apiClient.deleteRecording(id);

      // Show loading toast that resolves with the deletion
      await toast.promise(deletePromise, {
        loading: 'Deleting recording...',
        success: 'Recording deleted successfully',
        error: (err) => err.error || 'Failed to delete recording'
      });

      // Update state after successful deletion
      setRecordings(prev => prev.filter(rec => rec.id !== id));

      // Trigger optional refresh callback
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  // Download audio
  const handleDownload = (url: string, fileName: string) => {
    // Create a link and trigger download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Load recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Recordings</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fetchRecordings()}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      {loading && recordings.length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      ) : recordings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No recordings found. Start recording to see them here.
        </div>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording) => (
            <div
              key={recording.id}
              className="border border-border/40 rounded-lg p-4 bg-background"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{recording.name || recording.sessionId}</h3>
                  <div className="flex gap-2 items-center">
                    <p className="text-sm text-muted-foreground">{formatDate(recording.timestamp)}</p>
                    {recording.processingStatus === 'PENDING' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                        Processing
                      </span>
                    )}
                    {recording.processingStatus === 'ERROR' && (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                        Error
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={generatingTranscript[recording.id]}
                    onClick={async () => {
                      try {
                        setGeneratingTranscript(prev => ({ ...prev, [recording.id]: true }));
                        // Get authenticated URL
                        const audioUrl = new URL(recording.combinedAudio || recording.microphoneAudio, window.location.origin).toString();
                        await toast.promise(
                          async () => {
                            const response = await apiClient.generateTranscriptAndSummary(audioUrl, recording.id);
                            if (!response.success) {
                              throw new Error(response.error);
                            }
                            // Update the recording with transcript info and refresh the list
                            await fetchRecordings();
                            return response;
                          },
                          {
                            loading: 'Processing audio file...',
                            success: 'Generated transcript and summary',
                            error: (err) => err.message || 'Failed to generate transcript'
                          }
                        );
                      } catch (error) {
                        console.error('Error generating transcript:', error);
                      } finally {
                        setGeneratingTranscript(prev => ({ ...prev, [recording.id]: false }));
                      }
                    }}
                  >
                    <FileText size={16} className={recording.summaryData ? 'text-green-500' : ''} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(recording.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              {recording.summaryData && (
                <div className="mt-3 p-3 bg-muted/20 rounded-md">
                  <h4 className="text-sm font-medium text-primary mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {recording.summaryData.summary || 'No summary available'}
                  </p>
                  
                  {/* Show extracted information */}
                  {recording.summaryData.extracted_info && (
                    <div className="mt-4 space-y-3">
                      {/* Patient Info */}
                      <div className="space-y-1">
                        <h5 className="text-xs font-medium">Patient Information</h5>
                        <p className="text-xs text-muted-foreground">
                          {`Patient: ${recording.summaryData.extracted_info.patient_name || 'Not identified'}`}
                          {recording.summaryData.extracted_info.provider_name && 
                            ` | Provider: ${recording.summaryData.extracted_info.provider_name}`}
                        </p>
                      </div>

                      {/* Conditions */}
                      {recording.summaryData.extracted_info.conditions.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium">Conditions</h5>
                          <p className="text-xs text-muted-foreground">
                            {recording.summaryData.extracted_info.conditions.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Medications */}
                      {recording.summaryData.extracted_info.medications.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium">Medications</h5>
                          <p className="text-xs text-muted-foreground">
                            {recording.summaryData.extracted_info.medications.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Vital Signs */}
                      {Object.keys(recording.summaryData.extracted_info.vital_signs).length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium">Vital Signs</h5>
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(recording.summaryData.extracted_info.vital_signs).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {`${key}: ${value}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow-up Actions */}
                      {recording.summaryData.extracted_info.detailed_entities.follow_up.action_items.length > 0 && (
                        <div className="space-y-1">
                          <h5 className="text-xs font-medium">Follow-up Actions</h5>
                          <ul className="text-xs text-muted-foreground list-disc pl-4">
                            {recording.summaryData.extracted_info.detailed_entities.follow_up.action_items.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Microphone audio */}
                <div
                  className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => setSelectedAudio({
                    url: recording.microphoneAudio,
                    label: "Microphone Audio"
                  })}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">Microphone</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(
                          recording.microphoneAudio,
                          `microphone_${recording.sessionId}.wav`
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>

                {/* System audio */}
                <div
                  className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => setSelectedAudio({
                    url: recording.systemAudio,
                    label: "System Audio"
                  })}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">System</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(
                          recording.systemAudio,
                          `system_${recording.sessionId}.wav`
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>

                {/* Combined audio */}
                {recording.combinedAudio && (
                  <div
                    className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => setSelectedAudio({
                      url: recording.combinedAudio!,
                      label: "Combined Audio"
                    })}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">Combined</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(
                            recording.combinedAudio!,
                            `combined_${recording.sessionId}.wav`
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {nextCursor && (
            <div className="flex justify-center mt-4">
              <Button 
                variant="outline" 
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={selectedAudio !== null}
        onOpenChange={(open) => !open && setSelectedAudio(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedAudio?.label}</DialogTitle>
          </DialogHeader>
          {selectedAudio && (
            <AudioPlayer
              src={selectedAudio.url}
              label={selectedAudio.label}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
