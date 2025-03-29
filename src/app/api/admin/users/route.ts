import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromToken, createUser } from '@/lib/auth';
import { ApiError, withErrorHandling } from '@/lib/error-handler';

/**
 * GET /api/admin/users
 * 
 * Returns all users in the system
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

    // Get all users, excluding password field
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  });
}

/**
 * POST /api/admin/users
 * 
 * Creates a new user account
 */
export async function POST(req: NextRequest) {
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
    const { email, password, name, role } = await req.json();

    // Validate inputs
    if (!email || !password) {
      throw new ApiError('Email and password are required', 400);
    }

    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ApiError('User with this email already exists', 400);
    }

    // Create the new user
    const newUser = await createUser(email, password, name);

    // Update role if specified (createUser doesn't handle this)
    if (role && (role === 'ADMIN' || role === 'USER')) {
      await prisma.user.update({
        where: { id: newUser.id },
        data: { role },
      });
    }

    // Get the updated user
    const createdUser = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: createdUser });
  });
}
