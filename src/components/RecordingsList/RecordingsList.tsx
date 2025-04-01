'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Download, FileText, RefreshCw, Edit, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AudioPlayer } from "../AudioPlayer";
import { toast } from 'sonner';
import { apiClient, Recording } from '@/lib/api-client';

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
  const [processingRecordings, setProcessingRecordings] = useState<Record<string, boolean>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string>('');
  const [regeneratingSummary, setRegeneratingSummary] = useState<Record<string, boolean>>({});
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
      const response = await apiClient.getRecordings({ cursor, limit });

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

  // Download audio with authentication
  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url, apiClient.getAuthenticatedFetchOptions());
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading audio:', error);
      toast.error('Failed to download audio file');
    }
  };

  // Generate transcript and summary
  const handleGenerateSummary = async (recording: Recording) => {
    try {
      setProcessingRecordings(prev => ({ ...prev, [recording.id]: true }));

      // Get authenticated URL (prefer combined audio if available)
      const audioUrl = recording.combinedAudio || recording.microphoneAudio;

      await toast.promise(
        async () => {
          const response = await apiClient.generateTranscriptAndSummary(
            recording.id,
            audioUrl
          );

          if (!response.success) {
            throw new Error(response.error);
          }

          // Update the recording with processed data
          setRecordings(prev => prev.map(r =>
            r.id === recording.id
              ? {
                  ...r,
                  processingStatus: 'COMPLETED'
                }
              : r
          ));

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
      setProcessingRecordings(prev => ({ ...prev, [recording.id]: false }));
    }
  };

  // Regenerate summary
  const handleRegenerateSummary = async (recordingId: string) => {
    try {
      setRegeneratingSummary(prev => ({ ...prev, [recordingId]: true }));

      await toast.promise(
        async () => {
          const response = await apiClient.regenerateSummary(recordingId);

          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to regenerate summary');
          }

          // Update the recording in state
          const updatedRecording = response.data.recording;
          if (!updatedRecording) {
            throw new Error('Missing recording data in response');
          }
          
          setRecordings(prev => prev.map(r =>
            r.id === recordingId ? updatedRecording : r
          ));

          return response;
        },
        {
          loading: 'Regenerating summary...',
          success: 'Summary regenerated successfully',
          error: (err) => err.message || 'Failed to regenerate summary'
        }
      );
    } catch (error) {
      console.error('Error regenerating summary:', error);
    } finally {
      setRegeneratingSummary(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  // Edit summary
  const openEditSummary = (recordingId: string, currentSummary: string) => {
    setEditingSummary(recordingId);
    setSummaryText(currentSummary);
  };

  // Save edited summary
  const saveEditedSummary = async () => {
    if (!editingSummary) return;

    try {
      await toast.promise(
        async () => {
          const response = await apiClient.editSummary(editingSummary, summaryText);

          if (!response.success) {
            throw new Error(response.error);
          }

          // Update the recording with edited summary
          setRecordings(prev => prev.map(r =>
            r.id === editingSummary
              ? response.data?.recording || r
              : r
          ));

          return response;
        },
        {
          loading: 'Saving edited summary...',
          success: 'Summary updated successfully',
          error: (err) => err.message || 'Failed to update summary'
        }
      );

      // Close dialog after successful save
      setEditingSummary(null);
      setSummaryText('');
    } catch (error) {
      console.error('Error saving edited summary:', error);
    }
  };

  // Load recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return (
    <div className="mt-4">
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
            <Card
              key={recording.id}
              className="border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{recording.name || recording.sessionId}</CardTitle>
                    <CardDescription>{formatDate(recording.timestamp)}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(recording.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pb-2">
                {/* Processing Status */}
                {processingRecordings[recording.id] && (
                  <div className="bg-primary/5 rounded-md p-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      </div>
                      <span className="text-sm text-primary">Processing audio...</span>
                    </div>
                  </div>
                )}

                {/* Recording Status Badge */}
                {recording.processingStatus && recording.processingStatus !== 'PENDING' && !processingRecordings[recording.id] && (
                  <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mb-3 ${
                    recording.processingStatus === 'COMPLETED'
                      ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                      : recording.processingStatus === 'PROCESSING'
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {recording.processingStatus.charAt(0).toUpperCase() + recording.processingStatus.slice(1).toLowerCase()}
                  </div>
                )}

                {/* Summary Section */}
                {recording.summaryData ? (
                  <div className="mt-2 p-4 bg-muted/20 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-primary">Summary</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => openEditSummary(
                            recording.id,
                            recording.summaryData?.summary || ''
                          )}
                          disabled={regeneratingSummary[recording.id]}
                        >
                          <Edit size={14} className="mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => handleRegenerateSummary(recording.id)}
                          disabled={regeneratingSummary[recording.id]}
                        >
                          {regeneratingSummary[recording.id] ? (
                            <>
                              <RefreshCw size={14} className="mr-1 animate-spin" /> Processing...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={14} className="mr-1" /> Regenerate
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {recording.summaryData.summary || 'No summary available'}
                    </p>
                  </div>
                ) : (
                  recording.processingStatus !== 'PROCESSING' && !processingRecordings[recording.id] && (
                    <div className="mt-2 p-4 bg-muted/10 rounded-md flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        No transcript or summary available yet
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateSummary(recording)}
                        disabled={processingRecordings[recording.id]}
                      >
                        <FileText size={14} className="mr-2" />
                        Generate Summary
                      </Button>
                    </div>
                  )
                )}
              </CardContent>

              <CardFooter className="pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  {/* Microphone audio */}
                  <div
                    className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group flex items-center justify-between"
                    onClick={() => setSelectedAudio({
                      url: recording.microphoneAudio,
                      label: "Microphone Audio"
                    })}
                  >
                    <div className="flex items-center">
                      <Play size={14} className="mr-2 text-muted-foreground" />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">Microphone</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDownload(
                          recording.microphoneAudio,
                          `microphone_${recording.sessionId}.wav`
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    >
                      <Download size={14} />
                    </Button>
                  </div>

                  {/* System audio */}
                  <div
                    className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group flex items-center justify-between"
                    onClick={() => setSelectedAudio({
                      url: recording.systemAudio,
                      label: "System Audio"
                    })}
                  >
                    <div className="flex items-center">
                      <Play size={14} className="mr-2 text-muted-foreground" />
                      <span className="text-sm font-medium group-hover:text-primary transition-colors">System</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDownload(
                          recording.systemAudio,
                          `system_${recording.sessionId}.wav`
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                    >
                      <Download size={14} />
                    </Button>
                  </div>

                  {/* Combined audio */}
                  {recording.combinedAudio && (
                    <div
                      className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group flex items-center justify-between"
                      onClick={() => setSelectedAudio({
                        url: recording.combinedAudio!,
                        label: "Combined Audio"
                      })}
                    >
                      <div className="flex items-center">
                        <Play size={14} className="mr-2 text-muted-foreground" />
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">Combined</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleDownload(
                            recording.combinedAudio!,
                            `combined_${recording.sessionId}.wav`
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                      >
                        <Download size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
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

      {/* Audio Player Dialog */}
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

      {/* Edit Summary Dialog */}
      <Dialog
        open={editingSummary !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSummary(null);
            setSummaryText('');
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Summary</DialogTitle>
            <DialogDescription>
              Make changes to the summary below and save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            className="min-h-[200px]"
            placeholder="Enter the summary..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingSummary(null);
                setSummaryText('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveEditedSummary}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
