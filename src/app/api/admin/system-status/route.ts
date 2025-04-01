import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken } from '@/lib/auth';
import { ApiError, withErrorHandling } from '@/lib/error-handler';
import { storageService } from '@/lib/appwrite';

export type SystemStatus = 'operational' | 'degraded' | 'outage' | 'unknown';

export interface SystemStatusData {
  api: {
    status: SystemStatus;
    lastChecked: string;
  };
  storage: {
    status: SystemStatus;
    lastChecked: string;
  };
  authentication: {
    status: SystemStatus;
    lastChecked: string;
  };
  database: {
    status: SystemStatus;
    lastChecked: string;
  };
}

/**
 * GET /api/admin/system-status
 *
 * Checks and returns the status of various system components
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

    const now = new Date().toISOString();
    const statusData: SystemStatusData = {
      api: {
        status: 'operational',
        lastChecked: now
      },
      storage: {
        status: 'unknown',
        lastChecked: now
      },
      authentication: {
        status: 'unknown',
        lastChecked: now
      },
      database: {
        status: 'unknown',
        lastChecked: now
      }
    };

    // Check database status
    try {
      // Simple query to test database connection
      await prisma.$queryRaw`SELECT 1`;
      statusData.database.status = 'operational';
    } catch (error) {
      console.error('Database check failed:', error);
      statusData.database.status = 'outage';
    }

    // Check storage status
    try {
      // Attempt to list a small number of files to check storage access
      await storageService.listFiles(1);
      statusData.storage.status = 'operational';
    } catch (error) {
      console.error('Storage check failed:', error);
      statusData.storage.status = 'outage';
    }

    // Check authentication
    try {
      // Just verify the token again as a basic check
      if (user.id) {
        statusData.authentication.status = 'operational';
      } else {
        statusData.authentication.status = 'degraded';
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
      statusData.authentication.status = 'outage';
    }

    return NextResponse.json(statusData);
  });
}