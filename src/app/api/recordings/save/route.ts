import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storageService } from "@/lib/appwrite";
import { ApiError, withErrorHandling } from "@/lib/error-handler";


/**
 * POST /api/recordings/save
 * 
 * Saves a new recording to Appwrite storage and database
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

    // Parse form data
    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    const microphoneBlob = formData.get('microphoneAudio') as Blob;
    const systemBlob = formData.get('systemAudio') as Blob;
    const combinedBlob = formData.get('combinedAudio') as Blob || null;

    // Validate required fields
    if (!sessionId) {
      throw new ApiError('Missing session ID', 400);
    }

    if (!microphoneBlob || !systemBlob) {
      throw new ApiError('Missing required audio files', 400);
    }

    // Convert Blobs to File objects
    const convertBlobToFile = async (blob: Blob, prefix: string): Promise<File> => {
      const timestamp = Date.now();
      const fileName = `${prefix}_${timestamp}.wav`;
      return new File(
        [blob],
        fileName,
        { type: blob.type || 'audio/wav', lastModified: timestamp }
      );
    };

    // Convert blobs to files
    const microphoneFile = await convertBlobToFile(microphoneBlob, 'microphone');
    const systemFile = await convertBlobToFile(systemBlob, 'system');
    const combinedFile = combinedBlob ? await convertBlobToFile(combinedBlob, 'combined') : null;

    // Upload files to Appwrite storage
    console.log(`Uploading microphone recording: ${microphoneFile.name}`);
    const microphoneFileId = await storageService.uploadFile(microphoneFile, microphoneFile.name);

    console.log(`Uploading system recording: ${systemFile.name}`);
    const systemFileId = await storageService.uploadFile(systemFile, systemFile.name);

    // Upload combined file if available
    let combinedFileId: string | null = null;
    if (combinedFile) {
      console.log(`Uploading combined recording: ${combinedFile.name}`);
      combinedFileId = await storageService.uploadFile(combinedFile, combinedFile.name);
    }

    // Save recording to database
    const recording = await prisma.recording.create({
      data: {
        appwriteId: sessionId,
        name: `Recording ${new Date().toLocaleString()}`,
        duration: 0, // TODO: Calculate actual duration from audio file
        microphoneAudioFileId: microphoneFileId,
        systemAudioFileId: systemFileId,
        combinedAudioFileId: combinedFileId,
        userId: user.id
      }
    });

    // Construct file URLs
    const baseUrl = new URL(req.url).origin;
    
    return NextResponse.json({
      success: true,
      result: {
        id: recording.id,
        sessionId: recording.appwriteId,
        timestamp: recording.createdAt.toISOString(),
        name: recording.name,
        duration: recording.duration,
        microphoneAudio: `${baseUrl}/api/storage/file/${microphoneFileId}`,
        systemAudio: `${baseUrl}/api/storage/file/${systemFileId}`,
        combinedAudio: combinedFileId ? `${baseUrl}/api/storage/file/${combinedFileId}` : null
      },
      message: 'Recording saved successfully'
    });
  });
}
