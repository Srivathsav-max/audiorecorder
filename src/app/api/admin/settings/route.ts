import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, withErrorHandling } from '@/lib/error-handler';

/**
 * GET /api/admin/settings
 * 
 * Get application settings
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
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'app-settings' },
    });

    // If settings don't exist yet, return defaults
    if (!settings) {
      return NextResponse.json({
        registrationEnabled: true,
      });
    }

    return NextResponse.json({
      registrationEnabled: settings.registrationEnabled,
    });
  });
}

/**
 * PUT /api/admin/settings
 * 
 * Update application settings
 */
export async function PUT(req: NextRequest) {
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

    // Get request body
    const { registrationEnabled } = await req.json();

    // Validate
    if (typeof registrationEnabled !== 'boolean') {
      throw new ApiError('registrationEnabled must be a boolean', 400);
    }

    // Update or create settings
    const settings = await prisma.appSettings.upsert({
      where: { id: 'app-settings' },
      update: { registrationEnabled },
      create: {
        id: 'app-settings',
        registrationEnabled,
      },
    });

    return NextResponse.json({
      registrationEnabled: settings.registrationEnabled,
    });
  });
}
