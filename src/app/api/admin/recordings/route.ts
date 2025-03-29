import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, withErrorHandling } from '@/lib/error-handler';

/**
 * GET /api/admin/recordings
 * 
 * Get all recordings with pagination, filtering, and search
 */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    // Authenticate user and verify admin status
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError('Unauthorized', 401);
    }

    const token = authHeader.split(' ')[1];
    const user = await getUserFromToken(token);

    // Verify user is an admin
    if (user.role !== 'ADMIN') {
      throw new ApiError('Forbidden - Admin access required', 403);
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId');
    const searchQuery = searchParams.get('search');

    // Validate page and limit
    if (isNaN(page) || page < 1) {
      throw new ApiError('Invalid page parameter', 400);
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new ApiError('Invalid limit parameter, must be between 1 and 100', 400);
    }

    // Build filter object
    const filter: Prisma.RecordingWhereInput = {};
    if (userId) {
      filter.userId = userId;
    }
    if (searchQuery) {
      filter.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { user: { email: { contains: searchQuery, mode: 'insensitive' } } },
        { user: { name: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }

    // Get total count for pagination
    const totalRecordings = await prisma.recording.count({ where: filter });
    const totalPages = Math.ceil(totalRecordings / limit);

    // Get recordings with pagination
    const recordings = await prisma.recording.findMany({
      where: filter,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Transform recordings to include URLs
    const baseUrl = new URL(req.url).origin;
    const mappedRecordings = recordings.map(recording => ({
      id: recording.id,
      sessionId: recording.appwriteId,
      name: recording.name,
      timestamp: recording.createdAt.toISOString(),
      duration: recording.duration,
      microphoneAudio: `${baseUrl}/api/storage/file/${recording.microphoneAudioFileId}`,
      systemAudio: `${baseUrl}/api/storage/file/${recording.systemAudioFileId}`,
      combinedAudio: recording.combinedAudioFileId
        ? `${baseUrl}/api/storage/file/${recording.combinedAudioFileId}`
        : null,
      userId: recording.userId,
      userEmail: recording.user.email,
      userName: recording.user.name,
    }));

    return NextResponse.json({
      recordings: mappedRecordings,
      page,
      limit,
      totalPages,
      totalRecordings,
    });
  });
}
