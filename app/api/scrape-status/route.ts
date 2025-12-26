import { NextResponse } from "next/server";
import { getQueueStatus, cleanupOldJobs, cancelQueue } from "@/lib/scrape-queue";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/scrape-status
 * Get current scrape queue status
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = await getQueueStatus();
  return NextResponse.json(status);
}

/**
 * POST /api/scrape-status
 * Cancel all pending jobs and stop the worker
 */
export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await cancelQueue();
  return NextResponse.json({
    success: true,
    message: result.stopping
      ? `Cancelled ${result.cancelled} pending jobs. Current job will complete, then worker stops.`
      : `Cancelled ${result.cancelled} pending jobs.`,
    ...result,
  });
}

/**
 * DELETE /api/scrape-status
 * Clean up old completed/failed jobs
 */
export async function DELETE() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cleaned = await cleanupOldJobs();
  return NextResponse.json({ success: true, cleaned });
}
