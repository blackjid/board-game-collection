import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const SETTINGS_ID = "default";

export async function GET() {
  let settings = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
  });

  // Create default settings if not exists
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: SETTINGS_ID },
    });
  }

  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { collectionName, bggUsername } = body;

  const settings = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      ...(collectionName !== undefined && { collectionName }),
      ...(bggUsername !== undefined && { bggUsername }),
    },
    create: {
      id: SETTINGS_ID,
      collectionName,
      bggUsername,
    },
  });

  return NextResponse.json(settings);
}
