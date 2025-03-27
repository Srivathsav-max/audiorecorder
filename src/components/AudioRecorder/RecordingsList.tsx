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
import { databaseService, AudioFileDocument, deleteAudioRecording } from '@/lib/appwrite';
import { getAudioFileUrl } from './appwrite-utils';
import { toast } from 'sonner';

interface RecordingsListProps {
  onRefresh?: () => void;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({ onRefresh }) => {
  const [recordings, setRecordings] = useState<{ id: string; data: AudioFileDocument; created: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAudio, setSelectedAudio] = useState<{ url: string; label: string } | null>(null);

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

  // Fetch recordings
  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const documents = await databaseService.listAudioDocuments();
      const formattedRecordings = documents.map(doc => ({
        id: doc.$id,
        data: {
          sessionId: doc.sessionId,
          microphoneAudioFileId: doc.microphoneAudioFileId,
          systemAudioFileId: doc.systemAudioFileId,
          combinedAudioFileId: doc.combinedAudioFileId
        },
        created: doc.$createdAt
      }));
      
      // Sort by creation date (newest first)
      formattedRecordings.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      setRecordings(formattedRecordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  // Delete recording
  const handleDelete = async (id: string, document: AudioFileDocument) => {
    try {
      // Close dialog if the deleted recording is currently selected
      if (selectedAudio && (
        selectedAudio.url === getAudioFileUrl(document.microphoneAudioFileId) ||
        selectedAudio.url === getAudioFileUrl(document.systemAudioFileId) ||
        (document.combinedAudioFileId && selectedAudio.url === getAudioFileUrl(document.combinedAudioFileId))
      )) {
        setSelectedAudio(null);
      }

      const deletePromise = deleteAudioRecording(id, document);
      
      // Show loading toast that resolves with the deletion
      await toast.promise(deletePromise, {
        loading: 'Deleting recording...',
        success: 'Recording deleted successfully',
        error: 'Failed to delete recording'
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
  const handleDownload = (fileId: string, fileName: string) => {
    const url = getAudioFileUrl(fileId);
    
    // Create temporary link
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
  }, []);

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">Recordings</h2>
        <Button 
          size="sm" 
          variant="outline"
          onClick={fetchRecordings}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      
      
      {loading ? (
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
                  <h3 className="font-medium">{recording.data.sessionId}</h3>
                  <p className="text-sm text-muted-foreground">{formatDate(recording.created)}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="destructive" 
                  onClick={() => handleDelete(recording.id, recording.data)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Microphone audio */}
                <div 
                  className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => setSelectedAudio({
                    url: getAudioFileUrl(recording.data.microphoneAudioFileId),
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
                          recording.data.microphoneAudioFileId, 
                          `microphone_${recording.data.sessionId}.wav`
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
                    url: getAudioFileUrl(recording.data.systemAudioFileId),
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
                          recording.data.systemAudioFileId, 
                          `system_${recording.data.sessionId}.wav`
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
                
                {/* Combined audio */}
                {recording.data.combinedAudioFileId && (
                  <div 
                    className="bg-muted/30 rounded-md p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => setSelectedAudio({
                      url: getAudioFileUrl(recording.data.combinedAudioFileId!),
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
                            recording.data.combinedAudioFileId!, 
                            `combined_${recording.data.sessionId}.wav`
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
