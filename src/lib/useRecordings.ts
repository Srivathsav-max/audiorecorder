'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient, Recording } from '@/lib/api-client';

export function useRecordings(initialLimit: number = 10) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch initial recordings
  const fetchInitialRecordings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getRecordings({ 
        limit: initialLimit,
        cursor: undefined 
      });

      if (!response.success) {
        // Check if it's an auth error
        if (response.error?.includes('Authentication required')) {
          setError('Please log in to view recordings');
          toast.error('Please log in to view recordings');
          return;
        }
        throw new Error(response.error || 'Failed to fetch recordings');
      }

      const { recordings = [], nextCursor = undefined } = response.data || {};
      setRecordings(recordings);
      setNextCursor(nextCursor || null);
      setHasMore(!!nextCursor);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Only show a toast if this appears to be a server error, not a network error
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

      const response = await apiClient.getRecordings({ 
        cursor: nextCursor || undefined,
        limit: initialLimit 
      });

      if (!response.success) {
        // Check if it's an auth error
        if (response.error?.includes('Authentication required')) {
          setError('Please log in to view recordings');
          toast.error('Please log in to view recordings');
          return;
        }
        throw new Error(response.error || 'Failed to fetch more recordings');
      }

      const { recordings = [], nextCursor: newCursor = undefined } = response.data || {};
      setRecordings(prev => [...prev, ...recordings]);
      setNextCursor(newCursor || null);
      setHasMore(!!newCursor);
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
      fetchInitialRecordings().finally(() => {
        setInitialLoadDone(true);
      });
    }
  }, [fetchInitialRecordings, initialLoadDone]);

  // Function to add a new recording
  const addRecording = useCallback((newRecording: Recording) => {
    setRecordings(prev => [newRecording, ...prev]);
  }, []);

  // Function to delete a recording
  const deleteRecording = useCallback(async (index: number) => {
    if (index < 0 || index >= recordings.length) return;

    const recording = recordings[index];

    // Optimistically update UI
    setRecordings(prev => prev.filter((_, i) => i !== index));

    try {
      const response = await apiClient.deleteRecording(recording.id);

      if (!response.success) {
        // Check if it's an auth error
        if (response.error?.includes('Authentication required')) {
          toast.error('Please log in to delete recordings');
          // Restore the deleted recording
          setRecordings(prev => {
            const newRecordings = [...prev];
            newRecordings.splice(index, 0, recording);
            return newRecordings;
          });
          return;
        }
        throw new Error(response.error || 'Failed to delete recording');
      }

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
