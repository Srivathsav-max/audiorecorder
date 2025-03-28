import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { saveRecording } from "@/lib/recording-service";
import { getFormattedDateTime } from "@/components/AudioRecorder/utils";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Convert blobs to File objects with proper metadata
    const microphoneBlob = formData.get('microphoneAudio') as Blob;
    const systemBlob = formData.get('systemAudio') as Blob;
    const combinedBlob = formData.get('combinedAudio') as Blob || null;

    if (!microphoneBlob || !systemBlob) {
      return NextResponse.json(
        { error: 'Missing required audio files' },
        { status: 400 }
      );
    }

    // Convert Blobs to File objects
    const convertBlobToFile = async (blob: Blob, prefix: string): Promise<File> => {
      const arrayBuffer = await blob.arrayBuffer();
      const fileType = blob.type || 'audio/wav';
      return new File(
        [arrayBuffer], 
        `${prefix}_${Date.now()}.wav`,
        { type: fileType, lastModified: Date.now() }
      );
    };

    const microphoneFile = await convertBlobToFile(microphoneBlob, 'microphone');
    const systemFile = await convertBlobToFile(systemBlob, 'system');
    const combinedFile = combinedBlob ? await convertBlobToFile(combinedBlob, 'combined') : null;

    // Save recordings with converted File objects
    const result = await saveRecording(
      sessionId,
      microphoneFile,
      systemFile,
      combinedFile,
      user.id
    );

    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    return NextResponse.json(
      { error: 'Failed to save recording' },
      { status: 500 }
    );
  }
}
