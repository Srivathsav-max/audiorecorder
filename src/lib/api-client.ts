import { getCookie, AUTH_COOKIE_NAME } from "@/lib/cookies";
import jwt from 'jsonwebtoken';

/**
 * Types for API responses
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Recording type returned from the API
 */
export interface ExtractedInfo {
  text?: string;
  summary?: string;
  [key: string]: unknown | undefined;
}

export interface SummaryData {
  summary: string;
  lastModified: string;
  extracted_info: ExtractedInfo;
  [key: string]: string | ExtractedInfo;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

export interface TranscriptionData {
  segments: TranscriptSegment[];
  language?: string;
  duration?: number;
  [key: string]: unknown | undefined;
}

export interface Recording {
  id: string;
  sessionId: string;
  timestamp: string;
  name: string;
  duration: number;
  microphoneAudio: string;
  systemAudio: string;
  combinedAudio: string | null;
  transcript?: {
    transcriptUrl: string;
    summaryUrl: string;
    extractedInfo: ExtractedInfo;
  };
  processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  summaryData?: SummaryData | null;
  transcriptionData?: TranscriptionData;
}

/**
 * Type for request parameters
 */
export type RequestParams = Record<string, string | number | boolean | undefined>;

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams extends RequestParams {
  cursor?: string;
  limit?: number;
}

/**
 * API client for interacting with the backend
 */
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Get the authorization header with JWT token
   */
  private getAuthHeader(): HeadersInit {
    const token = getCookie(AUTH_COOKIE_NAME);

    if (!token) {
      throw new Error('Authentication required');
    }

    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Make a GET request to the API
   */
  /**
   * Make a GET request to the API with error handling and type safety
   */
  async get<T>(endpoint: string, params: RequestParams = {}): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const headers = {
        ...this.getAuthHeader(),
        'Content-Type': 'application/json'
      } as Record<string, string>;

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`API GET error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Make a POST request to the API
   */
  /**
   * Make a POST request to the API with error handling and type safety
   */
  async post<T>(endpoint: string, data?: FormData | Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request('POST', endpoint, data);
  }

  /**
   * Make a PATCH request to the API
   */
  async patch<T>(endpoint: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
    return this.request('PATCH', endpoint, data);
  }

  /**
   * Make an API request with error handling and type safety
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: FormData | Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = this.getAuthHeader() as Record<string, string>;

      // Handle FormData vs JSON
      const isFormData = data instanceof FormData;
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: isFormData ? data : JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const responseData = await response.json();
      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error(`API ${method} error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Make a DELETE request to the API
   */
  /**
   * Make a DELETE request to the API with error handling and type safety
   */
  async delete<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<ApiResponse<T>> {
    try {
      const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);

      // Add query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });

      const headers = this.getAuthHeader() as Record<string, string>;

      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`API DELETE error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // ===== Recordings API =====

  /**
   * Get a list of recordings
   */
  async getRecordings(params: PaginationParams = {}): Promise<ApiResponse<{ recordings: Recording[], nextCursor: string | null }>> {
    return this.get<{ recordings: Recording[], nextCursor: string | null }>('/recordings', params);
  }

  /**
   * Get a single recording by ID
   */
  async getRecording(id: string): Promise<ApiResponse<{ recording: Recording }>> {
    return this.get<{ recording: Recording }>(`/recordings/get`, { id });
  }

  /**
   * Save a new recording
   */
  async saveRecording(sessionId: string, microphoneBlob: Blob, systemBlob: Blob, combinedBlob: Blob | null): Promise<ApiResponse<Recording>> {
    const formData = new FormData();
    formData.append('sessionId', sessionId);
    formData.append('microphoneAudio', microphoneBlob, `microphone_${sessionId}.wav`);
    formData.append('systemAudio', systemBlob, `system_${sessionId}.wav`);

    if (combinedBlob) {
      formData.append('combinedAudio', combinedBlob, `combined_${sessionId}.wav`);
    }

    return this.post<Recording>('/recordings/save', formData);
  }

  /**
   * Delete a recording
   */
  async deleteRecording(id: string): Promise<ApiResponse<void>> {
    return this.delete<void>('/recordings', { id });
  }

  /**
   * Generate transcript and summary for a recording
   */
  async generateTranscriptAndSummary(recordingId: string, audioUrl: string): Promise<ApiResponse<{
    transcriptUrl: string;
    summaryUrl: string;
    extractedInfo: ExtractedInfo;
  }>> {
    try {
      // First update the recording status to PROCESSING
      await this.updateRecordingProcessingStatus(recordingId, 'PROCESSING');

      // Fetch the audio file with authentication headers
      const token = getCookie(AUTH_COOKIE_NAME);
      const audioResponse = await fetch(audioUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio file: ${audioResponse.status} ${audioResponse.statusText}`);
      }

      const audioBlob = await audioResponse.blob();
      // Ensure we're sending as WAV with .wav extension
      const originalFilename = audioUrl.split('/').pop() || '';
      const filename = originalFilename.replace(/\.[^/.]+$/, '') + '.wav';

      console.log('Audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type,
        filename: filename
      });

      // Create a form with the audio file
      const formData = new FormData();
      // Convert blob to WAV format if needed
      const audioFile = new File([audioBlob], filename, {
        type: 'audio/wav',
        lastModified: new Date().getTime()
      });
      formData.append('file', audioFile);
      formData.append('diarize', 'true');
      formData.append('transcribe', 'true');
      formData.append('summarize', 'true');
      formData.append('recordingId', recordingId);

      // Connect to our Speech2Transcript API
      // Get the base URL from environment variables or use a fallback
      const apiBaseUrl = process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:5512/api';
      const SPEECH_TO_TRANSCRIPT_API = `${apiBaseUrl}/process`;

      console.log('Sending request to:', SPEECH_TO_TRANSCRIPT_API);

      const response = await fetch(SPEECH_TO_TRANSCRIPT_API, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const text = await response.text();
        console.error('Error response:', text);
        throw new Error(text || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      // Update the recording in our database to mark it as processed
      await this.updateRecordingProcessingStatus(recordingId, 'COMPLETED', {
        transcriptionData: data.outputs.transcription,
        summaryData: data.outputs.summary,
        duration: data.outputs.diarization?.duration || 0
      });

      return {
        success: true,
        data: {
          transcriptUrl: data.outputs.transcription?.json,
          summaryUrl: data.outputs.summary?.text,
          extractedInfo: data.outputs.summary
        }
      };
    } catch (error) {
      console.error('Error generating transcript and summary:', error);

      // Update the recording to mark it as failed
      await this.updateRecordingProcessingStatus(recordingId, 'FAILED');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate transcript and summary'
      };
    }
  }

  /**
   * Regenerate summary for a recording (using existing transcript)
   */
  async regenerateSummary(recordingId: string): Promise<ApiResponse<{
    summaryUrl: string;
    extractedInfo: ExtractedInfo;
  }>> {
    try {
      // Get the recording data
      const response = await this.get<{
        recording: {
          id: string;
          transcriptionData: TranscriptionData;
        }
      }>(`/recordings/get`, { id: recordingId });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch recording data');
      }

      const { recording } = response.data;

      if (!recording.transcriptionData) {
        throw new Error('No transcription data available for this recording');
      }

      // Send the transcript to the Speech2Transcript API for regenerating summary
      // Get the base URL from environment variables or use a fallback
      const apiBaseUrl = process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:5512/api';
      const SPEECH_TO_TRANSCRIPT_API = `${apiBaseUrl}/regenerate-summary`;

      const apiResponse = await fetch(SPEECH_TO_TRANSCRIPT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          transcription: recording.transcriptionData,
          recordingId: recordingId
        }),
        mode: 'cors'
      });

      if (!apiResponse.ok) {
        const text = await apiResponse.text();
        throw new Error(text || `HTTP error ${apiResponse.status}`);
      }

      const data = await apiResponse.json();

      // Update the recording with the new summary
      await this.updateRecordingSummary(recordingId, data.outputs.summary);

      // Create response data with default values if undefined
      const responseData = {
        summaryUrl: data.outputs.summary?.text || '',
        extractedInfo: data.outputs.summary || {}
      };

      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error('Error regenerating summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate summary'
      };
    }
  }

  /**
   * Edit summary for a recording
   */
  async editSummary(recordingId: string, newSummaryText: string): Promise<ApiResponse<{
    success: boolean;
    recording: Recording;
  }>> {
    try {
      console.log('Editing summary for recording:', recordingId);
      // Update the recording with the edited summary
      const response = await this.patch<{
        success: boolean;
        recording: Recording;
      }>(`/recordings/${recordingId}`, {
        summary: newSummaryText
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update summary');
      }

      console.log('Summary update response:', response);
      // Return properly mapped response data
      if (response.data?.recording) {
        return {
          success: true,
          data: response.data
        };
      }
      throw new Error('Invalid response format from server');
    } catch (error) {
      console.error('Error editing summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit summary'
      };
    }
  }

  /**
   * Update recording processing status
   */
  private async updateRecordingProcessingStatus(
    recordingId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    data?: {
      transcriptionData?: TranscriptionData;
      summaryData?: SummaryData;
      duration?: number;
    }
  ): Promise<ApiResponse<{success: boolean}>> {
    try {
      console.log('Updating recording status:', recordingId, status);
      return await this.patch<{success: boolean}>(`/recordings/${recordingId}`, {
        status,
        ...data
      });
    } catch (error) {
      console.error('Error updating recording status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recording status'
      };
    }
  }

  /**
   * Update recording summary
   */
  private async updateRecordingSummary(
    recordingId: string,
    summaryData: SummaryData
  ): Promise<ApiResponse<{success: boolean}>> {
    try {
      console.log('Updating recording summary:', recordingId);
      return await this.patch<{success: boolean}>(`/recordings/${recordingId}`, {
        summaryData,
        // No need to send user info as it's handled by auth middleware
      });
    } catch (error) {
      console.error('Error updating recording summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recording summary'
      };
    }
  }

  /**
   * Get the current user ID from the token
   */
  private getCurrentUserId(): string | null {
    try {
      const token = getCookie(AUTH_COOKIE_NAME);
      if (!token) return null;

      const decoded = jwt.decode(token) as { id: string } | null;
      return decoded?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Get the current user role from the token
   */
  private getCurrentUserRole(): string | null {
    try {
      const token = getCookie(AUTH_COOKIE_NAME);
      if (!token) return null;

      const decoded = jwt.decode(token) as { role: string } | null;
      return decoded?.role || null;
    } catch (error) {
      console.error('Error getting user role:', error);
      return null;
    }
  }

  // ===== Storage API =====

  /**
   * Get authenticated file URL with auth token
   */
  getAuthenticatedFileUrl(fileId: string): string {
    const token = getCookie(AUTH_COOKIE_NAME);
    if (!token) {
      throw new Error('Authentication required to access file');
    }
    return `/api/storage/file/${fileId}`;
  }

  /**
   * Create authenticated fetch options for file access
   */
  getAuthenticatedFetchOptions(): RequestInit {
    const token = getCookie(AUTH_COOKIE_NAME);
    if (!token) {
      throw new Error('Authentication required to access file');
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }
}

// Singleton instance
export const apiClient = new ApiClient();
