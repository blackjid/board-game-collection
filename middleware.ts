import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Pages that require admin access (will redirect to login)
const ADMIN_PAGES = ["/settings"];

// API routes where mutating methods (POST, PATCH, DELETE) require admin
// GET requests are public for these routes (for collection viewing)
const PROTECTED_API_PREFIXES = [
  "/api/games",
  "/api/collection",
  "/api/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if this is an admin page
  const isAdminPage = ADMIN_PAGES.some((route) => pathname.startsWith(route));

  // Check if this is a protected API with a mutating method
  const isProtectedApi =
    PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    ["POST", "PATCH", "DELETE"].includes(method);

  // Check if viewing a specific collection (GET /api/collections/[id])
  const collectionMatch = pathname.match(/^\/api\/collections\/([^/]+)$/);
  const isViewingCollection = collectionMatch && method === "GET";

  // If not a protected route, allow through
  if (!isAdminPage && !isProtectedApi && !isViewingCollection) {
    return NextResponse.next();
  }

  // Get session cookie
  const sessionId = request.cookies.get("session_id")?.value;

  // For viewing a specific collection, check if it's public
  if (isViewingCollection && !sessionId) {
    const collectionId = collectionMatch[1];
    try {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        select: { isPublic: true },
      });

      // If collection is public, allow access
      if (collection?.isPublic) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error("Error checking collection public status:", error);
    }
    // If collection not found or not public, return 401
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!sessionId) {
    if (isAdminPage) {
      // Redirect to login page for admin pages
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Return 401 for protected API routes
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cookie exists - route handlers will validate session and admin role
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/settings/:path*",
    "/api/games/:path*",
    "/api/collection/:path*",
    "/api/collections/:path*",
    "/api/settings/:path*",
  ],
};
