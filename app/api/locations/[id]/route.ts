import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSavedLocation, deleteSavedLocation } from "@/lib/locations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/locations/[id]
 * Get a single saved location
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const location = await getSavedLocation(id);

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error getting location:", error);
    return NextResponse.json(
      { error: "Failed to get location" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/locations/[id]
 * Delete a saved location
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;

    const deleted = await deleteSavedLocation(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting location:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
