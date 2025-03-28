import { NextResponse } from 'next/server';

export async function HEAD() {
  // Return an empty 200 response for RTT measurement
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

// Also handle GET requests for browsers that don't support HEAD
export async function GET() {
  return HEAD();
}
