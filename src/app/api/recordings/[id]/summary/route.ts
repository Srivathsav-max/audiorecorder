import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { ApiError, withRouteErrorHandling } from "@/lib/error-handler";

/**
 * POST /api/recordings/:id/summary
 * 
 * Updates the summary of a recording
 */
async function updateSummary(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get params
  const { id } = await params;
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    if (!id || typeof id !== 'string') {
      throw new ApiError('Recording ID is required', 400);
    }

    // Parse request body
    const body = await req.json();
    const { summaryData } = body;

    if (!summaryData) {
      throw new ApiError('Summary data is required', 400);
    }

    // Check if recording exists and belongs to user
    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      throw new ApiError('Recording not found', 404);
    }

    if (recording.userId !== user.id && user.role !== 'ADMIN') {
      throw new ApiError('You do not have permission to modify this recording', 403);
    }

    // Update the recording summary
    await prisma.recording.update({
      where: { id },
      data: {
        summaryData
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Summary updated successfully'
    });
}

export const POST = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(updateSummary);
