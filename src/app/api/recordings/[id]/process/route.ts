import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/error-handler";
import { ApiError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";

/**
 * POST /api/recordings/[id]/process
 * 
 * Updates a recording with processed data (transcription, summary, etc.)
 */
async function updateProcessedRecording(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get ID from params
  const { id } = await params;
  if (!id || typeof id !== 'string') {
    throw new ApiError('Recording ID is required', 400);
  }

  // Validate request
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new ApiError('Missing authorization header', 401);
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    throw new ApiError('Invalid authorization format. Use Bearer token', 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new ApiError('Missing token in authorization header', 401);
  }

  // Authenticate user
  const user = await getUserFromToken(token);

  // Check if recording exists and belongs to user
  const existingRecording = await prisma.recording.findUnique({
    where: { id }
  });

  if (!existingRecording) {
    throw new ApiError('Recording not found', 404);
  }

  if (existingRecording.userId !== user.id && user.role !== 'ADMIN') {
    throw new ApiError('You do not have permission to process this recording', 403);
  }

  // Parse request body
  const { processingResult, processingStatus, processedAt } = await req.json();

  // Format the data to match the JSON structure and handle null values
  const transcriptionData = processingResult.transcription ? 
    JSON.parse(JSON.stringify({
      segments: processingResult.transcription.segments
    })) as Prisma.InputJsonValue : 
    Prisma.JsonNull;

  const summaryData = processingResult.summary ? 
    JSON.parse(JSON.stringify({
      summary: processingResult.summary.summary,
      extracted_info: processingResult.summary.extracted_info
    })) as Prisma.InputJsonValue : 
    Prisma.JsonNull;

  // Update the recording
  const recording = await prisma.recording.update({
    where: { id },
    data: {
      transcriptionData,
      summaryData,
      processingStatus,
      processedAt: processedAt ? new Date(processedAt) : null,
      duration: processingResult.diarization?.duration || 0
    }
  });

  return NextResponse.json({
    success: true,
    result: recording
  });
}

export const POST = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(updateProcessedRecording);
