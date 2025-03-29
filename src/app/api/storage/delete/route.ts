import { NextRequest, NextResponse } from "next/server";
import { storage, APPWRITE_STORAGE_BUCKET_ID } from "@/lib/appwrite";
import { getUserFromToken } from "@/lib/auth";
import { ApiError, withErrorHandling } from "@/lib/error-handler";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/storage/delete
 * 
 * Deletes files from Appwrite storage
 * Requires authentication and file IDs in request body
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    // Parse request body
    const body = await req.json();
    const { fileIds, recordingId } = body;

    // Validate request
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new ApiError('File IDs array is required', 400);
    }

    // If recordingId is provided, validate user ownership
    if (recordingId) {
      const recording = await prisma.recording.findUnique({
        where: { id: recordingId }
      });

      if (!recording) {
        throw new ApiError('Recording not found', 404);
      }

      if (recording.userId !== user.id) {
        throw new ApiError('You do not have permission to delete these files', 403);
      }
    }

    // Delete each file
    const results = await Promise.allSettled(
      fileIds.map(async (fileId) => {
        try {
          await storage.deleteFile(APPWRITE_STORAGE_BUCKET_ID, fileId);
          return { fileId, success: true };
        } catch (error) {
          console.error(`Error deleting file ${fileId}:`, error);
          return { fileId, success: false, error };
        }
      })
    );

    // Check results
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

    // Return results
    return NextResponse.json({
      success: true,
      message: `Deleted ${succeeded} files${failed > 0 ? `, ${failed} failed` : ''}`,
      results: results.map(r => 
        r.status === 'fulfilled' 
          ? r.value 
          : { success: false, error: r.reason }
      )
    });
  });
}
