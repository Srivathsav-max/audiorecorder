'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';

export function useRecordings() {
  const [recordings, setRecordings] = useState<RecordedAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recordings from server
  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/getRecordings');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.recordings)) {
        setRecordings(data.recordings);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Only show a toast if this appears to be a server error, not a network error
      // (to avoid showing errors when offline)
      if (navigator.onLine) {
        toast.error('Failed to load recordings');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchRecordings();
    
    // Optional: set up periodic refreshing (e.g., every 30 seconds)
    const intervalId = setInterval(fetchRecordings, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchRecordings]);

  // Function to add a new recording
  const addRecording = useCallback((newRecording: RecordedAudio) => {
    setRecordings(prev => [newRecording, ...prev]);
  }, []);

  // Function to delete a recording
  const deleteRecording = useCallback(async (index: number) => {
    if (index < 0 || index >= recordings.length) return;
    
    const recording = recordings[index];
    
    // Extract filenames from URLs
    const getFilenameFromUrl = (url: string | null) => {
      if (!url) return null;
      return url.split('/').pop(); // Get the last part after the slash
    };
    
    const microphoneFilename = getFilenameFromUrl(recording.microphoneAudio);
    const systemFilename = getFilenameFromUrl(recording.systemAudio);
    const combinedFilename = getFilenameFromUrl(recording.combinedAudio);
    
    // Optimistically update UI
    setRecordings(prev => prev.filter((_, i) => i !== index));
    
    try {
      // Delete each file
      const deletePromises: Promise<Response>[] = [];
      
      if (microphoneFilename) {
        deletePromises.push(
          fetch(`/api/deleteRecording?filename=${encodeURIComponent(microphoneFilename)}`, {
            method: 'DELETE'
          })
        );
      }
      
      if (systemFilename) {
        deletePromises.push(
          fetch(`/api/deleteRecording?filename=${encodeURIComponent(systemFilename)}`, {
            method: 'DELETE'
          })
        );
      }
      
      if (combinedFilename) {
        deletePromises.push(
          fetch(`/api/deleteRecording?filename=${encodeURIComponent(combinedFilename)}`, {
            method: 'DELETE'
          })
        );
      }
      
      // Wait for all delete operations to complete
      await Promise.all(deletePromises);
      
      toast.success('Recording deleted successfully');
    } catch (err) {
      console.error('Error deleting recording:', err);
      toast.error('Failed to delete recording');
      
      // Fetch recordings again to restore correct state
      fetchRecordings();
    }
  }, [recordings, fetchRecordings]);

  return {
    recordings,
    loading,
    error,
    fetchRecordings,
    addRecording,
    deleteRecording
  };
}