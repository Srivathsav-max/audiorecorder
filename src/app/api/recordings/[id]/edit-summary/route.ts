import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { ApiError, withRouteErrorHandling } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";
import { SummaryData } from "@/lib/api-client";

/**
 * POST /api/recordings/:id/edit-summary
 * 
 * Updates a recording's summary text directly from user input
 */
async function editSummary(
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
    const { summary } = body;

    if (!summary) {
      throw new ApiError('Summary text is required', 400);
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

    // Get the current summary data and ensure it's a valid object
    const currentSummaryData = (recording.summaryData || {}) as Record<string, unknown>;
    
    // Create a properly typed summary data object
    const updatedSummaryData: SummaryData = {
      summary: summary,
      lastModified: new Date().toISOString(),
      extracted_info: {
        text: summary,
        ...(currentSummaryData.extracted_info as Record<string, unknown> || {})
      }
    };

    // Update the recording summary
    await prisma.recording.update({
      where: { id },
      data: {
        summaryData: updatedSummaryData as Prisma.InputJsonValue
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Summary edited successfully'
    });
}

export const POST = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(editSummary);
