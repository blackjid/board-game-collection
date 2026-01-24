import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listSavedLocations, createSavedLocation } from "@/lib/locations";
import type { CreateSavedLocationInput } from "@/types/play";

/**
 * GET /api/locations
 * List all saved locations
 */
export async function GET() {
  try {
    const locations = await listSavedLocations();
    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Error listing locations:", error);
    return NextResponse.json(
      { error: "Failed to list locations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations
 * Create a new saved location
 * Body: { name: string, latitude: number, longitude: number }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body: CreateSavedLocationInput = await request.json();

    // Validation
    if (!body.name || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (body.latitude < -90 || body.latitude > 90) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90" },
        { status: 400 }
      );
    }

    if (body.longitude < -180 || body.longitude > 180) {
      return NextResponse.json(
        { error: "Longitude must be between -180 and 180" },
        { status: 400 }
      );
    }

    const location = await createSavedLocation(body);
    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
