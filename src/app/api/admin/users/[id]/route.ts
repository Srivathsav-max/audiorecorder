import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, withErrorHandling } from '@/lib/error-handler';

/**
 * GET /api/admin/recordings/:id
 * 
 * Get details for a specific recording
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    // Await the params to get the id
    const { id } = await params;
    
    // Authenticate user and verify admin status
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    // Verify user is an admin
    if (user.role !== 'ADMIN') {
      throw new ApiError('Forbidden - Admin access required', 403);
    }

    // Get recording details
    const recording = await prisma.recording.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!recording) {
      throw new ApiError('Recording not found', 404);
    }

    // Transform recording to include URLs
    const baseUrl = new URL(request.url).origin;
    const recordingWithUrls = {
      id: recording.id,
      sessionId: recording.appwriteId,
      name: recording.name,
      timestamp: recording.createdAt.toISOString(),
      duration: recording.duration,
      microphoneAudio: `${baseUrl}/api/storage/file/${recording.microphoneAudioFileId}`,
      systemAudio: `${baseUrl}/api/storage/file/${recording.systemAudioFileId}`,
      combinedAudio: recording.combinedAudioFileId
        ? `${baseUrl}/api/storage/file/${recording.combinedAudioFileId}`
        : null,
      userId: recording.userId,
      userEmail: recording.user.email,
      userName: recording.user.name,
    };

    return NextResponse.json({
      success: true,
      recording: recordingWithUrls
    });
  });
}

/**
 * DELETE /api/admin/recordings/:id
 * 
 * Delete a recording
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandling(async () => {
    // Await the params to get the id
    const { id } = await params;
    
    // Authenticate user and verify admin status
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    // Verify user is an admin
    if (user.role !== 'ADMIN') {
      throw new ApiError('Forbidden - Admin access required', 403);
    }

    // Check if recording exists
    const recording = await prisma.recording.findUnique({
      where: { id },
    });

    if (!recording) {
      throw new ApiError('Recording not found', 404);
    }

    // Delete recording
    await prisma.recording.delete({
      where: { id },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Recording deleted successfully'
    });
  });
}