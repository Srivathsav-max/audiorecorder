import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, withErrorHandling } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest, context: { params: { id: string } }) {
  return withErrorHandling(async () => {
    const { id } = await Promise.resolve(context.params);
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    const { processingResult, processingStatus, processedAt } = await req.json();

    // Update recording with processed data
    // Format the data to match the JSON structure and handle null values
    const transcriptionData = processingResult.transcription ? 
      JSON.parse(JSON.stringify({
        segments: processingResult.transcription.segments
      })) : 
      Prisma.JsonNull;

    const summaryData = processingResult.summary ? 
      JSON.parse(JSON.stringify({
        summary: processingResult.summary.summary,
        extracted_info: processingResult.summary.extracted_info
      })) : 
      Prisma.JsonNull;

    const recording = await prisma.recording.update({
      where: { id },
      data: {
        transcriptionData: transcriptionData,  
        summaryData: summaryData,             
        processingStatus: processingStatus,    
        processedAt: processedAt ? new Date(processedAt) : null, 
        duration: processingResult.diarization?.duration || 0
      }
    });

    return NextResponse.json({
      success: true,
      result: recording
    });
  });
}
