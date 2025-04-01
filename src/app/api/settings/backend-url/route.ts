import { NextResponse } from 'next/server';
import { withRouteErrorHandling } from '@/lib/error-handler';
import { getBackendUrl } from '@/lib/server/settings-service';

async function getBackendUrlHandler() {
  try {
    const url = await getBackendUrl();
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error fetching backend URL:', error);
    return NextResponse.json({
      url: process.env.NEXT_PUBLIC_SPEECH2TRANSCRIPT_API_URL || 'http://localhost:8000'
    });
  }
}

export const GET = withRouteErrorHandling(getBackendUrlHandler);
