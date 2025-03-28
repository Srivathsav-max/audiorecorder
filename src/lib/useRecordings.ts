'use client';

import { useState, useEffect, useCallback } from 'react';
import { RecordedAudio } from '@/components/AudioRecorder/types';
import { toast } from 'sonner';
import { getCookie, AUTH_COOKIE_NAME } from './cookies';

export function useRecordings(initialLimit: number = 10) {
  const [recordings, setRecordings] = useState<RecordedAudio[]>([]);
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
      
      const token = getCookie(AUTH_COOKIE_NAME);
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/recordings?limit=${initialLimit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
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
      
      const token = getCookie(AUTH_COOKIE_NAME);
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `/api/recordings?cursor=${nextCursor}&limit=${initialLimit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
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
      fetchInitialRecordings().finally(() => {
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
    const token = getCookie(AUTH_COOKIE_NAME);
    
    if (!token) {
      toast.error('Authentication required');
      return;
    }
    
    // Optimistically update UI
    setRecordings(prev => prev.filter((_, i) => i !== index));
    
    try {
      const response = await fetch(`/api/recordings?id=${recording.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
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
