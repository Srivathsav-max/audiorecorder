import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken, AuthUser } from "./auth";
import { ApiError, withErrorHandling } from "./error-handler";

/**
 * Helper function to handle the common pattern of route handlers with dynamic params
 * This avoids the "params should be awaited" error by properly structuring the handling
 */
export function createDynamicRouteHandler(handler: (req: NextRequest, id: string, user: AuthUser) => Promise<NextResponse>) {
  return async (req: NextRequest, context: { params: { id: string } }) => {
    return withErrorHandling(async () => {
      // Authenticate user
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        throw new ApiError('Unauthorized', 401);
      }

      const token = authHeader.split(' ')[1];
      const user = await getUserFromToken(token);

      // Get ID from context - using the proper pattern for Next.js
      const id = context.params.id;
      if (!id) {
        throw new ApiError('ID is required', 400);
      }

      // Call the handler function with extracted parameters
      return handler(req, id, user);
    });
  };
}
