import { getCookie, AUTH_COOKIE_NAME } from './cookies';

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
export interface Recording {
  id: string;
  sessionId: string;
  timestamp: string;
  name: string;
  duration: number;
  microphoneAudio: string;
  systemAudio: string;
  combinedAudio: string | null;
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
