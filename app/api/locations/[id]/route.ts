import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSavedLocation, updateSavedLocation, deleteSavedLocation } from "@/lib/locations";

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
 * PATCH /api/locations/[id]
 * Update a saved location
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { name, latitude, longitude } = body;

    // Validate that at least one field is provided
    if (name === undefined && latitude === undefined && longitude === undefined) {
      return NextResponse.json(
        { error: "At least one field (name, latitude, longitude) is required" },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined && (!name || typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json(
        { error: "Name must be a non-empty string" },
        { status: 400 }
      );
    }

    // Validate coordinates if provided
    if (latitude !== undefined && (typeof latitude !== "number" || latitude < -90 || latitude > 90)) {
      return NextResponse.json(
        { error: "Latitude must be a number between -90 and 90" },
        { status: 400 }
      );
    }

    if (longitude !== undefined && (typeof longitude !== "number" || longitude < -180 || longitude > 180)) {
      return NextResponse.json(
        { error: "Longitude must be a number between -180 and 180" },
        { status: 400 }
      );
    }

    const location = await updateSavedLocation(id, {
      ...(name !== undefined && { name }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error updating location:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update location" },
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
