import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/appwrite";
import { getUserFromToken } from "@/lib/auth";
import { withRouteErrorHandling } from "@/lib/error-handler";
import { AuthError, StorageError } from "@/lib/error-handler";

/**
 * GET /api/storage/file/[id]
 * 
 * Returns the file from Appwrite storage.
 * This endpoint acts as a proxy to Appwrite storage, 
 * allowing us to keep Appwrite credentials on the server only.
 */
async function getStorageFile(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Get file ID from params
  const { id } = await params;

  // Validate request
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    throw new AuthError('Missing authorization header');
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthError('Invalid authorization format. Use Bearer token');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AuthError('Missing token in authorization header');
  }

  // Authenticate user
  try {
    await getUserFromToken(token);
  } catch (error) {
    // getUserFromToken now throws AuthError with specific messages
    throw error;
  }

  try {
    if (!id || typeof id !== 'string') {
      throw new StorageError('Invalid file ID', 400);
    }

    // Get the file preview URL from Appwrite
    const filePreviewUrl = storageService.getFilePreview(id);
    
    // Proxy the file through our server
    const fileResponse = await fetch(filePreviewUrl);
    
    if (!fileResponse.ok) {
      throw new StorageError(
        `Failed to fetch file: ${fileResponse.statusText}`,
        fileResponse.status
      );
    }
    
    // Get the file content and headers
    const fileBuffer = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    
    // Create a new response with the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="file-${id}"`,
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      }
    });
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      'File not found or inaccessible',
      404,
      error instanceof Error ? error.message : undefined
    );
  }
}

export const GET = withRouteErrorHandling<NextResponse, [NextRequest, { params: Promise<{ id: string }> }]>(getStorageFile);
