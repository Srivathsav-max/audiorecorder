import { createUser, generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Check if registrations are allowed
    const appSettings = await prisma.appSettings.findUnique({
      where: { id: 'app-settings' },
    });
    
    // If settings exist and registrations are disabled
    if (appSettings && !appSettings.registrationEnabled) {
      return NextResponse.json(
        { error: 'New account registration is currently disabled' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await createUser(email, password, name);
    const token = generateToken(user);

    return NextResponse.json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error creating user' },
      { status: 500 }
    );
  }
}