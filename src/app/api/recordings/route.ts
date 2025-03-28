import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAudioFileUrl } from "@/lib/recording-service";
import { getUserFromToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    const searchParams = req.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10');

    const recordings = await prisma.recording.findMany({
      where: {
        userId: user.id,
      },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: {
        createdAt: 'desc',
      },
    });

    const nextCursor = recordings.length === limit ? recordings[recordings.length - 1].id : null;

    // Map recordings to include audio URLs
    const mappedRecordings = recordings.map(recording => ({
      id: recording.id,
      sessionId: recording.appwriteId,
      timestamp: recording.createdAt,
      name: recording.name,
      duration: recording.duration,
      microphoneAudio: getAudioFileUrl(recording.microphoneAudioFileId),
      systemAudio: getAudioFileUrl(recording.systemAudioFileId),
      combinedAudio: recording.combinedAudioFileId 
        ? getAudioFileUrl(recording.combinedAudioFileId)
        : null,
    }));

    return NextResponse.json({
      success: true,
      recordings: mappedRecordings,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Recording ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const recording = await prisma.recording.findUnique({
      where: { id }
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Recording not found' },
        { status: 404 }
      );
    }

    if (recording.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await prisma.recording.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}
