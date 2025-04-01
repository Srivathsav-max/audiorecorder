import { prisma } from '../prisma';

/**
 * Server-side version of settings service that uses Prisma directly.
 * This version should only be used in API routes, not in client components.
 */

export async function getBackendUrl(): Promise<string> {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'app-settings' }
    });

    return settings?.backendUrl || process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:8000';
  } catch (error) {
    console.error('Error fetching backend URL:', error);
    return process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:8000';
  }
}
