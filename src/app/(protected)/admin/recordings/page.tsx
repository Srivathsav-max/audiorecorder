'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  PlayCircle, 
  StopCircle, 
  Download, 
  Trash2, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Disc 
} from 'lucide-react';
import { Label } from '@/components/ui/label';

interface RecordingData {
  id: string;
  sessionId: string;
  name: string;
  timestamp: string;
  duration: number;
  microphoneAudio: string;
  systemAudio: string;
  combinedAudio: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
}

export default function AdminRecordingsPage() {
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userFilter, setUserFilter] = useState<string>('');
  const [usersList, setUsersList] = useState<{id: string, email: string, name: string | null}[]>([]);
  
  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<RecordingData | null>(null);

  // Audio player dialog state
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState<RecordingData | null>(null);
  const [selectedAudioType, setSelectedAudioType] = useState<'mic' | 'system' | 'combined'>('combined');

  const PAGE_SIZE = 10;

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
      });
      
      if (userFilter) {
        queryParams.append('userId', userFilter);
      }

      const response = await fetch(`/api/admin/recordings?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }

      const data = await response.json();
      setRecordings(data.recordings);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentPage, userFilter]);

  useEffect(() => {
    fetchRecordings();
    fetchUsers();
  }, [currentPage, userFilter, fetchRecordings]);

  useEffect(() => {
    // Clean up audio on unmount
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  async function fetchUsers() {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsersList(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  async function deleteRecording() {
    if (!recordingToDelete) return;
    
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await fetch(`/api/admin/recordings/${recordingToDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete recording');
      }

      // Close dialog and refresh recordings
      setDeleteDialogOpen(false);
      setRecordingToDelete(null);
      await fetchRecordings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete recording');
    }
  }

  function handleDeleteRecording(recording: RecordingData) {
    setRecordingToDelete(recording);
    setDeleteDialogOpen(true);
  }

  function handlePlayRecording(recording: RecordingData) {
    setSelectedRecording(recording);
    setPlayerDialogOpen(true);
    setSelectedAudioType(recording.combinedAudio ? 'combined' : 'mic');
  }

  function playAudio(url: string) {
    if (audioElement) {
      audioElement.pause();
    }
    
    const audio = new Audio(url);
    setAudioElement(audio);
    
    audio.onplay = () => {
      setIsPlaying(true);
    };
    
    audio.onpause = () => {
      setIsPlaying(false);
    };
    
    audio.onended = () => {
      setIsPlaying(false);
    };
    
    audio.play();
  }

  function stopAudio() {
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }
  }

  function handleDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function formatDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // Filter recordings by search query
  const filteredRecordings = recordings.filter(recording => 
    (recording.name && recording.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (recording.userName && recording.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    recording.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recordings Management</CardTitle>
          <CardDescription>
            Browse, play, and manage all recordings across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search recordings by name or user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  {usersList.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center p-4">Loading recordings...</div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg">
              {error}
            </div>
          ) : filteredRecordings.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              {searchQuery || userFilter ? 'No recordings match your search.' : 'No recordings found.'}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">Recording</th>
                        <th className="px-4 py-3 text-left font-medium">User</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Duration</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecordings.map((recording) => (
                        <tr key={recording.id} className="border-b">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                <Disc className="h-4 w-4" />
                              </div>
                              <div className="font-medium">{recording.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{recording.userName || recording.userEmail}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {new Date(recording.timestamp).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(recording.duration)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePlayRecording(recording)}
                              >
                                <PlayCircle className="h-4 w-4" />
                                <span className="sr-only">Play</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => 
                                  handleDownload(
                                    recording.combinedAudio || recording.microphoneAudio, 
                                    `${recording.name}.mp3`
                                  )
                                }
                              >
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                onClick={() => handleDeleteRecording(recording)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Recording Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Recording Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {recordingToDelete && (
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-foreground/20">
                  <Disc className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{recordingToDelete.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(recordingToDelete.timestamp).toLocaleDateString()} - {formatDuration(recordingToDelete.duration)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recorded by: {recordingToDelete.userName || recordingToDelete.userEmail}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={deleteRecording}
            >
              Delete Recording
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audio Player Dialog */}
      <Dialog open={playerDialogOpen} onOpenChange={(open) => {
        if (!open) stopAudio();
        setPlayerDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Audio Player</DialogTitle>
            <DialogDescription>
              {selectedRecording && (
                <div className="text-sm">
                  {selectedRecording.name} - {formatDuration(selectedRecording.duration)}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecording && (
            <div className="space-y-4">
              <div className="flex justify-center gap-3 p-4">
                <Button
                  variant={isPlaying ? "destructive" : "default"}
                  size="icon"
                  onClick={() => {
                    if (isPlaying) {
                      stopAudio();
                    } else {
                      let audioUrl = '';
                      if (selectedAudioType === 'mic') {
                        audioUrl = selectedRecording.microphoneAudio;
                      } else if (selectedAudioType === 'system') {
                        audioUrl = selectedRecording.systemAudio;
                      } else if (selectedAudioType === 'combined' && selectedRecording.combinedAudio) {
                        audioUrl = selectedRecording.combinedAudio;
                      } else {
                        audioUrl = selectedRecording.microphoneAudio;
                      }
                      playAudio(audioUrl);
                    }
                  }}
                >
                  {isPlaying ? (
                    <StopCircle className="h-6 w-6" />
                  ) : (
                    <PlayCircle className="h-6 w-6" />
                  )}
                  <span className="sr-only">{isPlaying ? 'Stop' : 'Play'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    let audioUrl = '';
                    let filename = '';
                    
                    if (selectedAudioType === 'mic') {
                      audioUrl = selectedRecording.microphoneAudio;
                      filename = `${selectedRecording.name}-mic.mp3`;
                    } else if (selectedAudioType === 'system') {
                      audioUrl = selectedRecording.systemAudio;
                      filename = `${selectedRecording.name}-system.mp3`;
                    } else if (selectedAudioType === 'combined' && selectedRecording.combinedAudio) {
                      audioUrl = selectedRecording.combinedAudio;
                      filename = `${selectedRecording.name}-combined.mp3`;
                    } else {
                      audioUrl = selectedRecording.microphoneAudio;
                      filename = `${selectedRecording.name}-mic.mp3`;
                    }
                    
                    handleDownload(audioUrl, filename);
                  }}
                >
                  <Download className="h-6 w-6" />
                  <span className="sr-only">Download</span>
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label>Audio Source</Label>
                <Select 
                  value={selectedAudioType} 
                  onValueChange={(value: 'mic' | 'system' | 'combined') => {
                    stopAudio();
                    setSelectedAudioType(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audio source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mic">Microphone Audio</SelectItem>
                    <SelectItem value="system">System Audio</SelectItem>
                    {selectedRecording.combinedAudio && (
                      <SelectItem value="combined">Combined Audio</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="pt-2">
                <div className="text-xs text-muted-foreground">
                  <p>
                    <strong>Recorded by:</strong> {selectedRecording.userName || selectedRecording.userEmail}
                  </p>
                  <p>
                    <strong>Date:</strong> {new Date(selectedRecording.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
