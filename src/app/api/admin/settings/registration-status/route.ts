import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/settings/registration-status
 * 
 * Public endpoint to check if registration is enabled
 */
export async function GET() {
  try {
    // Get application settings
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'app-settings' },
    });

    // If settings don't exist yet, return registration as enabled by default
    if (!settings) {
      return NextResponse.json({
        registrationEnabled: true,
      });
    }

    return NextResponse.json({
      registrationEnabled: settings.registrationEnabled,
    });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    // Default to enabled if there's an error to avoid blocking registration unnecessarily
    return NextResponse.json({ 
      registrationEnabled: true,
      error: 'Error fetching registration status'
    });
  }
}
