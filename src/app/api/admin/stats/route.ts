import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, withErrorHandling } from '@/lib/error-handler';

/**
 * GET /api/admin/stats
 * 
 * Returns dashboard statistics for the admin panel
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

    // Get application settings
    const appSettings = await prisma.appSettings.findUnique({
      where: { id: 'app-settings' },
    }) || { registrationEnabled: true };

    // Count total users
    const totalUsers = await prisma.user.count();

    // Count total recordings
    const totalRecordings = await prisma.recording.count();

    return NextResponse.json({
      totalUsers,
      totalRecordings,
      registrationEnabled: appSettings.registrationEnabled,
    });
  });
}
