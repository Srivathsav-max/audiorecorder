'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';

export function useRecordings(initialLimit: number = 10) {
  const [recordings, setRecordings] = useState<RecordedAudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch initial recordings
  const fetchInitialRecordings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/getRecordings?limit=${initialLimit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.recordings)) {
        setRecordings(data.recordings);
        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
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
  }, [initialLimit]);

  // Load more recordings
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/getRecordings?cursor=${nextCursor}&limit=${initialLimit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch more recordings');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.recordings)) {
        setRecordings(prev => [...prev, ...data.recordings]);
        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } else {
        throw new Error(data.error || 'Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching more recordings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      if (navigator.onLine) {
        toast.error('Failed to load more recordings');
      }
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, nextCursor, initialLimit]);

  // Initial fetch on mount
  useEffect(() => {
    if (!initialLoadDone) {
      setLoading(true);
      fetchInitialRecordings().finally(() => {
        setLoading(false);
        setInitialLoadDone(true);
      });
    }
  }, [fetchInitialRecordings, initialLoadDone]);

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
      fetchInitialRecordings();
    }
  }, [recordings, fetchInitialRecordings]);

  return {
    recordings,
    loading,
    error,
    hasMore,
    loadMore,
    addRecording,
    deleteRecording,
    refresh: fetchInitialRecordings
  };
}
