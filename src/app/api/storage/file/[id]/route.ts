import { NextRequest, NextResponse } from "next/server";
import { storage, APPWRITE_STORAGE_BUCKET_ID } from "@/lib/appwrite";
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
interface FileRouteContext {
  params: {
    id: string;
  };
}

async function getStorageFile(
  req: NextRequest,
  context: FileRouteContext
) {
  // Get file ID from params
  const { id } = context.params;

  // Authenticate user
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthError('Authentication required for file access');
  }

  const token = authHeader.split(' ')[1];
  await getUserFromToken(token);

  try {
    // Get the file view URL from Appwrite
    const fileView = storage.getFileView(APPWRITE_STORAGE_BUCKET_ID, id);
    
    // Fetch the file using the URL to proxy it
    const fileResponse = await fetch(fileView.toString());
    
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

export const GET = withRouteErrorHandling<NextResponse, [NextRequest, FileRouteContext]>(getStorageFile);
