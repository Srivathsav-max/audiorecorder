import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/error-handler";
import { ApiError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";

/**
 * POST /api/recordings/[id]/status
 * 
 * Updates the processing status of a recording
 */
async function updateRecordingStatus(
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

  // Parse and validate request body
  const body = await req.json();
  const { status, transcriptionData, summaryData, duration } = body;

  // Validate status
  if (!status || !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
    throw new ApiError('Invalid processing status', 400);
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

  // Update the recording status
  const updateData: Prisma.RecordingUpdateInput = {
    processingStatus: status,
  };

  // Set processedAt based on status
  if (status === 'COMPLETED') {
    updateData.processedAt = new Date();
  } else if (status === 'FAILED' || status === 'PENDING') {
    updateData.processedAt = null;
  }

  // Add additional data if provided
  if (transcriptionData) {
    updateData.transcriptionData = transcriptionData as Prisma.InputJsonValue;
  }

  if (summaryData) {
    updateData.summaryData = summaryData as Prisma.InputJsonValue;
  }

  if (duration !== undefined) {
    updateData.duration = duration;
  }

  // Update the recording
  await prisma.recording.update({
    where: { id },
    data: updateData
  });

  return NextResponse.json({
    success: true,
    message: `Recording status updated to ${status}`
  });
}

export const POST = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(updateRecordingStatus);
