let cachedBackendUrl: string | null = null;

export async function getBackendUrl(): Promise<string> {
  try {
    if (cachedBackendUrl) {
      return cachedBackendUrl;
    }

    const response = await fetch('/api/settings/backend-url');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch backend URL: ${response.status}`);
    }
    
    const data = await response.json();
    cachedBackendUrl = data.url;
    
    return cachedBackendUrl as string;
  } catch (error) {
    console.error('Error fetching backend URL:', error);
    
    const fallbackUrl = process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:8000';
    return fallbackUrl;
  }
}
