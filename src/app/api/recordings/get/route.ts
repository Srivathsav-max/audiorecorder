import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { ApiError, withErrorHandling } from "@/lib/error-handler";

/**
 * GET /api/recordings/get?id={id}
 * 
 * Gets a single recording by ID using query parameter instead of dynamic route
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

    // Get recording ID from query parameters
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      throw new ApiError('Recording ID is required', 400);
    }

    // Fetch the recording
    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new ApiError('Recording not found', 404);
    }

    // Check if user has access to this recording
    if (recording.userId !== user.id && user.role !== 'ADMIN') {
      throw new ApiError('You do not have permission to access this recording', 403);
    }

    // Map recording to include audio URLs
    const baseUrl = new URL(req.url).origin;
    const mappedRecording = {
      id: recording.id,
      sessionId: recording.appwriteId,
      timestamp: recording.createdAt.toISOString(),
      name: recording.name,
      duration: recording.duration,
      processingStatus: recording.processingStatus,
      microphoneAudio: `${baseUrl}/api/storage/file/${recording.microphoneAudioFileId}`,
      systemAudio: `${baseUrl}/api/storage/file/${recording.systemAudioFileId}`,
      combinedAudio: recording.combinedAudioFileId
        ? `${baseUrl}/api/storage/file/${recording.combinedAudioFileId}`
        : null,
      transcriptionData: recording.transcriptionData,
      summaryData: recording.summaryData,
      processedAt: recording.processedAt?.toISOString() || null
    };

    return NextResponse.json({
      success: true,
      recording: mappedRecording
    });
  });
}