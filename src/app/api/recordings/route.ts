import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { ApiError, withErrorHandling } from "@/lib/error-handler";

/**
 * GET /api/recordings
 * 
 * Fetches recordings with pagination
 */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ApiError('Invalid limit parameter, must be between 1 and 100', 400);
    }

    // Fetch recordings with pagination
    const recordings = await prisma.recording.findMany({
      where: {
        userId: user.id,
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Determine next cursor for pagination
    const nextCursor = recordings.length === limit ? recordings[recordings.length - 1].id : null;

    // Map recordings to include audio URLs
    const baseUrl = new URL(req.url).origin;
    const mappedRecordings = recordings.map(recording => ({
      id: recording.id,
      sessionId: recording.appwriteId,
      timestamp: recording.createdAt.toISOString(),
      name: recording.name,
      duration: recording.duration,
      microphoneAudio: `${baseUrl}/api/storage/file/${recording.microphoneAudioFileId}`,
      systemAudio: `${baseUrl}/api/storage/file/${recording.systemAudioFileId}`,
      combinedAudio: recording.combinedAudioFileId
        ? `${baseUrl}/api/storage/file/${recording.combinedAudioFileId}`
        : null,
    }));

    return NextResponse.json({
      success: true,
      recordings: mappedRecordings,
      nextCursor,
    });
  });
}

/**
 * DELETE /api/recordings?id={id}
 * 
 * Deletes a recording
 */
export async function DELETE(req: NextRequest) {
  return withErrorHandling(async () => {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    // Get recording ID from query parameters
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      throw new ApiError('Recording ID is required', 400);
    }

    // Verify recording exists and belongs to user
    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new ApiError('Recording not found', 404);
    }

    if (recording.userId !== user.id) {
      throw new ApiError('You do not have permission to delete this recording', 403);
    }

    // Delete recording
    await prisma.recording.delete({
      where: { id }
    });

    // TODO: Delete files from Appwrite storage
    // This would be handled by a background job or a separate API call
    // to avoid blocking the response

    return NextResponse.json({ 
      success: true,
      message: 'Recording deleted successfully'
    });
  });
}
