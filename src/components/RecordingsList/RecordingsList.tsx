'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AudioPlayer } from "../AudioPlayer";
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { getCookie, AUTH_COOKIE_NAME } from '@/lib/cookies';

interface Recording {
  id: string;
  sessionId: string;
  timestamp: string;
  name: string;
  duration: number;
  microphoneAudio: string;
  systemAudio: string;
  combinedAudio: string | null;
}

interface RecordingsListProps {
  onRefresh?: () => void;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({ onRefresh }) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAudio, setSelectedAudio] = useState<{ url: string; label: string } | null>(null);
  const { user } = useAuth();
  const authToken = getCookie(AUTH_COOKIE_NAME);
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
  const fetchRecordings = async (cursor?: string) => {
    try {
      setLoading(true);
      
      if (!authToken) {
        toast.error('Please log in to view recordings');
        return;
      }

      const url = new URL('/api/recordings', window.location.origin);
      if (cursor) {
        url.searchParams.append('cursor', cursor);
      }
      url.searchParams.append('limit', limit.toString());

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch recordings');
      }

      setRecordings(cursor ? [...recordings, ...data.recordings] : data.recordings);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  // Load more recordings
  const loadMore = () => {
    if (nextCursor) {
      fetchRecordings(nextCursor);
    }
  };

  // Delete recording
  const handleDelete = async (id: string) => {
    try {
      if (!authToken) {
        toast.error('Please log in to delete recordings');
        return;
      }

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

      const deletePromise = fetch(`/api/recordings?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }).then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete recording');
        }
        return response.json();
      });

      // Show loading toast that resolves with the deletion
      await toast.promise(deletePromise, {
        loading: 'Deleting recording...',
        success: 'Recording deleted successfully',
        error: (err) => err.message || 'Failed to delete recording'
      });

      // Update state after successful deletion
      setRecordings(recordings.filter(rec => rec.id !== id));

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
    // Create temporary link
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Load recordings on mount and when token changes
  useEffect(() => {
    if (authToken) {
      fetchRecordings();
    }
  }, [authToken]);

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
                  <p className="text-sm text-muted-foreground">{formatDate(recording.timestamp)}</p>
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleDelete(recording.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>

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
