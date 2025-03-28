import { NextResponse } from 'next/server';

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  code?: string;
}

export interface ApiErrorResponseWithStatus extends ApiErrorResponse {
  status: number;
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;
  code?: string;

  constructor(message: string, status: number = 500, details?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

/**
 * Storage error class for file-related errors
 */
export class StorageError extends ApiError {
  constructor(message: string, status: number = 500, details?: unknown) {
    super(message, status, details, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}

/**
 * Authentication error class
 */
export class AuthError extends ApiError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 401, details, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponseWithStatus> {
  console.error('API Error:', error);

  // Known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.details,
        code: error.code,
        status: error.status
      }, 
      { status: error.status }
    );
  }

  // Appwrite errors
  if (error instanceof Error && error.message.includes('Appwrite')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Storage service error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'STORAGE_ERROR',
        status: 503
      }, 
      { status: 503 }
    );
  }

  // File access errors
  if (error instanceof Error && 
      (error.message.includes('ENOENT') || 
       error.message.includes('file') || 
       error.message.includes('storage'))) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'File access error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'FILE_ERROR',
        status: 404
      }, 
      { status: 404 }
    );
  }

  // Validation errors
  if (error instanceof Error && error.name === 'ValidationError') {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Validation error', 
        details: error.message,
        code: 'VALIDATION_ERROR',
        status: 400
      }, 
      { status: 400 }
    );
  }

  // Authentication errors
  if (error instanceof Error && 
      (error.message.toLowerCase().includes('unauthorized') || 
       error.message.toLowerCase().includes('forbidden') || 
       error.message.toLowerCase().includes('authentication'))) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed', 
        details: error.message,
        code: 'AUTH_ERROR',
        status: 401
      }, 
      { status: 401 }
    );
  }

  // Database errors
  if (error instanceof Error && 
      (error.message.includes('database') || 
       error.message.includes('prisma') || 
       error.message.toLowerCase().includes('sql'))) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'DB_ERROR',
        status: 500
      }, 
      { status: 500 }
    );
  }

  // Default error
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  
  return NextResponse.json(
    { 
      success: false, 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      code: 'INTERNAL_ERROR',
      status: 500
    }, 
    { status: 500 }
  );
}

/**
 * Async error handler for API routes
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context?: { service?: string }
): Promise<T | NextResponse<ApiErrorResponseWithStatus>> {
  return handler().catch((error) => {
    // Add context to error logging
    if (context?.service) {
      console.error(`Error in ${context.service}:`, error);
    }
    return handleApiError(error);
  });
}

/**
 * Route handler wrapper with error handling
 */
export function withRouteErrorHandling<T, P extends unknown[]>(
  handler: (...args: P) => Promise<T>
): (...args: P) => Promise<T | NextResponse<ApiErrorResponseWithStatus>> {
  return async (...args: P) => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
