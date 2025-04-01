import { prisma } from './prisma';

export async function getBackendUrl(): Promise<string> {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'app-settings' }
    });
    
    return settings?.backendUrl || process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:8000';
  } catch (error) {
    console.error('Error fetching backend URL:', error);
    return 'http://localhost:8000'; 
  }
}
