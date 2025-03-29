import { AUTH_COOKIE_NAME } from './cookies';

/**
 * Get the authentication token from cookies
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
  // Use the named constant from cookies.ts
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.split('=')[1] || null;
}

/**
 * Create Authorization headers with the token
 * @param contentType Include Content-Type header if provided
 * @returns Headers object with Authorization header
 */
export function createAuthHeaders(contentType?: string): HeadersInit {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
}

/**
 * Wrapper for fetch that adds authorization headers
 * @param url URL to fetch
 * @param options Fetch options
 * @returns Fetch response
 */
export async function fetchWithAuth(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
