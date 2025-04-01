import { getCookie, AUTH_COOKIE_NAME } from "@/lib/cookies";

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
  conditions: string[];
  detailed_entities: {
    conditions: {
      confidence: 'low' | 'medium' | 'high';
      list: string[];
    };
    follow_up: {
      action_items: string[];
      confidence: 'low' | 'medium' | 'high';
      next_appointment: string | null;
    };
    lifestyle: {
      confidence: 'low' | 'medium' | 'high';
      diet: string | null;
      exercise: string | null;
      smoking_status: string | null;
    };
    medications: {
      adherence: string | null;
      confidence: 'low' | 'medium' | 'high';
      list: string[];
    };
    patient_name: {
      confidence: 'low' | 'medium' | 'high';
      value: string | null;
    };
    provider_name: {
      confidence: 'low' | 'medium' | 'high';
      value: string | null;
    };
    vital_signs: {
      blood_pressure: string | null;
      confidence: 'low' | 'medium' | 'high';
      glucose: number;
      other: Record<string, string>;
      weight: string | null;
    };
  };
  medications: string[];
  patient_name: string;
  provider_name: string;
  speakers: {
    care_manager: string;
    patient: string | null;
  };
  vital_signs: Record<string, string>;
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
  processingStatus: 'PENDING' | 'COMPLETED' | 'ERROR';
  processedAt?: string;
  transcriptionData?: {
    segments: Array<{
      end: number;
      label: string;
      language: string;
      language_probability: number;
      segment: {
        end: number;
        start: number;
      };
      speaker: string;
      start: number;
      transcription: string;
      word_timestamps: any[];
    }>;
  };
  summaryData?: {
    summary: string;
    extracted_info: ExtractedInfo;
  };
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
    try {
      const url = `${this.baseUrl}${endpoint}`;

      const headers = this.getAuthHeader() as Record<string, string>;

      // Handle FormData vs JSON
      const isFormData = data instanceof FormData;
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method: 'POST',
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
      console.error(`API POST error (${endpoint}):`, error);
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
  async generateTranscriptAndSummary(audioUrl: string, recordingId: string): Promise<ApiResponse<{
    transcriptUrl: string;
    summaryUrl: string;
    extractedInfo: any;
  }>> {
    try {
      // First fetch the audio file
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error('Failed to fetch audio file');
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
      
      // Connect to our Speech2Transcript API
      const SPEECH_TO_TRANSCRIPT_API = 'http://localhost:5512/api/process';
      
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
      
      // Save the processed data to database
      await this.post(`/recordings/${recordingId}/process`, {
        processingResult: data.outputs,
        processingStatus: 'COMPLETED',
        processedAt: new Date().toISOString()
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate transcript and summary'
      };
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
