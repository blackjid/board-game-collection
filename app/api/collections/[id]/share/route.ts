import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/collections/[id]/share
 * Generate or regenerate a share token for a collection
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    // Check collection exists
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Generate a random 16-character token
    const shareToken = randomBytes(12).toString("base64url");

    // Update collection with new share token
    const collection = await prisma.collection.update({
      where: { id },
      data: { shareToken },
    });

    return NextResponse.json({
      shareToken: collection.shareToken,
    });
  } catch (error) {
    console.error("Failed to generate share token:", error);
    return NextResponse.json(
      { error: "Failed to generate share token" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/collections/[id]/share
 * Remove the share token from a collection (disable sharing)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    // Check collection exists
    const existing = await prisma.collection.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Remove share token
    await prisma.collection.update({
      where: { id },
      data: { shareToken: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove share token:", error);
    return NextResponse.json(
      { error: "Failed to remove share token" },
      { status: 500 }
    );
  }
}
