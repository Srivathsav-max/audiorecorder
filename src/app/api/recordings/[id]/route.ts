import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromToken } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/error-handler";
import { ApiError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";
import { SummaryData } from "@/lib/api-client";

/**
 * GET /api/recordings/[id]
 * 
 * Gets a single recording by ID
 */
async function getRecording(
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
}

/**
 * PATCH /api/recordings/[id]
 * 
 * Updates a recording's status and related data
 */
async function updateRecording(
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

  // Parse request body
  const body = await req.json();
  const { status, transcriptionData, summaryData, duration, summary } = body;

  // Validate status if provided
  if (status && !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
    throw new ApiError('Invalid processing status', 400);
  }

  // If summary is provided, validate it
  if (summary !== undefined && typeof summary !== 'string') {
    throw new ApiError('Summary must be a string', 400);
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
  const updateData: Prisma.RecordingUpdateInput = {};

  if (status) {
    updateData.processingStatus = status;
    // Set processedAt based on status
    if (status === 'COMPLETED') {
      updateData.processedAt = new Date();
    } else if (status === 'FAILED' || status === 'PENDING') {
      updateData.processedAt = null;
    }
  }

  // Add additional data if provided
  if (transcriptionData) {
    updateData.transcriptionData = transcriptionData as Prisma.InputJsonValue;
  }

  if (summaryData) {
    updateData.summaryData = summaryData as Prisma.InputJsonValue;
  }

  if (summary !== undefined) {
    // Update only the text field in summaryData while preserving other fields
    const existingSummaryData = recording.summaryData as SummaryData | null;
    // Create new summaryData with only the required fields
    const newSummaryData = {
      summary: summary,
      lastModified: new Date().toISOString(),
      extracted_info: existingSummaryData?.extracted_info || {
        text: summary
      }
    } as Prisma.InputJsonValue;
    updateData.summaryData = newSummaryData;
  }

  if (duration !== undefined) {
    updateData.duration = duration;
  }

  // Update the recording
  const updatedRecording = await prisma.recording.update({
    where: { id },
    data: updateData
  });

  // Return the complete updated recording data
  const baseUrl = new URL(req.url).origin;
  const mappedRecording = {
    id: updatedRecording.id,
    sessionId: updatedRecording.appwriteId,
    timestamp: updatedRecording.createdAt.toISOString(),
    name: updatedRecording.name,
    duration: updatedRecording.duration,
    processingStatus: updatedRecording.processingStatus,
    microphoneAudio: `${baseUrl}/api/storage/file/${updatedRecording.microphoneAudioFileId}`,
    systemAudio: `${baseUrl}/api/storage/file/${updatedRecording.systemAudioFileId}`,
    combinedAudio: updatedRecording.combinedAudioFileId
      ? `${baseUrl}/api/storage/file/${updatedRecording.combinedAudioFileId}`
      : null,
    transcriptionData: updatedRecording.transcriptionData,
    summaryData: updatedRecording.summaryData,
    processedAt: updatedRecording.processedAt?.toISOString() || null
  };

  return NextResponse.json({
    success: true,
    message: status ? `Recording status updated to ${status}` : 'Recording updated',
    recording: mappedRecording
  });
}

export const GET = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(getRecording);
export const PATCH = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(updateRecording);
