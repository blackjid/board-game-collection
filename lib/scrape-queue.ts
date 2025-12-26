/**
 * Database-backed scrape queue with background worker
 *
 * Jobs are stored in SQLite and processed sequentially.
 * Survives server restarts and provides full job history.
 */

import prisma from "./prisma";
import { scrapeGame } from "./sync";

// Job status types
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface ScrapeJob {
  id: string;
  gameId: string;
  gameName: string;
  status: JobStatus;
  error?: string | null;
  createdAt: Date;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface QueueStatus {
  isProcessing: boolean;
  isStopping: boolean;
  currentJob: ScrapeJob | null;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  cancelledCount: number;
  recentJobs: ScrapeJob[];
}

// Worker state (in-memory, but jobs are in DB)
let isProcessing = false;
let currentJobId: string | null = null;
let stopRequested = false;

// How many days to keep completed jobs
const JOB_RETENTION_DAYS = 7;

/**
 * Add a game to the scrape queue
 */
export async function enqueueScrape(gameId: string, gameName: string): Promise<ScrapeJob> {
  // Check if already in queue (pending or processing)
  const existing = await prisma.scrapeJob.findFirst({
    where: {
      gameId,
      status: { in: ["pending", "processing"] },
    },
  });

  if (existing) {
    return existing as ScrapeJob;
  }

  // Create new job
  const job = await prisma.scrapeJob.create({
    data: {
      gameId,
      gameName,
      status: "pending",
    },
  });

  // Start processing if not already running
  if (!isProcessing) {
    // Don't await - let it run in background
    processQueue();
  }

  return job as ScrapeJob;
}

/**
 * Add multiple games to the scrape queue
 */
export async function enqueueScrapeMany(games: Array<{ id: string; name: string }>): Promise<ScrapeJob[]> {
  const jobs: ScrapeJob[] = [];

  for (const game of games) {
    const job = await enqueueScrape(game.id, game.name);
    jobs.push(job);
  }

  return jobs;
}

/**
 * Get a specific job by ID
 */
export async function getJob(jobId: string): Promise<ScrapeJob | null> {
  const job = await prisma.scrapeJob.findUnique({
    where: { id: jobId },
  });
  return job as ScrapeJob | null;
}

/**
 * Get current queue status
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  const [pendingCount, completedCount, failedCount, cancelledCount, recentJobs, currentJob] = await Promise.all([
    prisma.scrapeJob.count({ where: { status: "pending" } }),
    prisma.scrapeJob.count({ where: { status: "completed" } }),
    prisma.scrapeJob.count({ where: { status: "failed" } }),
    prisma.scrapeJob.count({ where: { status: "cancelled" } }),
    prisma.scrapeJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    currentJobId
      ? prisma.scrapeJob.findUnique({ where: { id: currentJobId } })
      : null,
  ]);

  return {
    isProcessing,
    isStopping: stopRequested,
    currentJob: currentJob as ScrapeJob | null,
    pendingCount,
    completedCount,
    failedCount,
    cancelledCount,
    recentJobs: recentJobs as ScrapeJob[],
  };
}

/**
 * Clear completed/failed jobs older than retention period
 */
export async function cleanupOldJobs(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - JOB_RETENTION_DAYS);

  const result = await prisma.scrapeJob.deleteMany({
    where: {
      status: { in: ["completed", "failed", "cancelled"] },
      completedAt: { lt: cutoffDate },
    },
  });

  if (result.count > 0) {
    console.log(`[ScrapeQueue] Cleaned up ${result.count} old jobs`);
  }

  return result.count;
}

/**
 * Cancel all pending jobs and stop the worker after current job
 * Returns the number of jobs cancelled
 */
export async function cancelQueue(): Promise<{ cancelled: number; stopping: boolean }> {
  // Cancel all pending jobs
  const result = await prisma.scrapeJob.updateMany({
    where: { status: "pending" },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
  });

  console.log(`[ScrapeQueue] Cancelled ${result.count} pending jobs`);

  // Request worker to stop after current job
  const wasProcessing = isProcessing;
  if (isProcessing) {
    stopRequested = true;
    console.log("[ScrapeQueue] Stop requested - will stop after current job");
  }

  return {
    cancelled: result.count,
    stopping: wasProcessing,
  };
}

/**
 * Cancel a specific job by ID
 * Only works for pending jobs
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const job = await prisma.scrapeJob.findUnique({
    where: { id: jobId },
  });

  if (!job || job.status !== "pending") {
    return false;
  }

  await prisma.scrapeJob.update({
    where: { id: jobId },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
  });

  console.log(`[ScrapeQueue] Cancelled job: ${job.gameName}`);
  return true;
}

/**
 * Resume any jobs that were interrupted (e.g., server restart)
 * Called on server startup
 */
export async function resumeInterruptedJobs(): Promise<void> {
  // Reset any "processing" jobs back to "pending" (they were interrupted)
  const interrupted = await prisma.scrapeJob.updateMany({
    where: { status: "processing" },
    data: { status: "pending", startedAt: null },
  });

  if (interrupted.count > 0) {
    console.log(`[ScrapeQueue] Reset ${interrupted.count} interrupted jobs to pending`);
  }

  // Check if there are pending jobs and start processing
  const pendingCount = await prisma.scrapeJob.count({
    where: { status: "pending" },
  });

  if (pendingCount > 0 && !isProcessing) {
    console.log(`[ScrapeQueue] Resuming ${pendingCount} pending jobs...`);
    processQueue();
  }

  // Cleanup old jobs
  await cleanupOldJobs();
}

/**
 * Process the queue (runs in background)
 */
async function processQueue(): Promise<void> {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  stopRequested = false;

  try {
    while (true) {
      // Check if stop was requested
      if (stopRequested) {
        console.log("[ScrapeQueue] Stop requested, stopping worker.");
        break;
      }

      // Get next pending job
      const job = await prisma.scrapeJob.findFirst({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
      });

      if (!job) {
        break; // No more jobs
      }

      currentJobId = job.id;

      // Mark as processing
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: "processing",
          startedAt: new Date(),
        },
      });

      console.log(`[ScrapeQueue] Processing: ${job.gameName} (${job.gameId})`);

      try {
        const success = await scrapeGame(job.gameId);

        if (success) {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: {
              status: "completed",
              completedAt: new Date(),
            },
          });
          console.log(`[ScrapeQueue] Completed: ${job.gameName}`);
        } else {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              error: "Scrape returned false",
              completedAt: new Date(),
            },
          });
          console.log(`[ScrapeQueue] Failed: ${job.gameName}`);
        }
      } catch (error) {
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date(),
          },
        });
        console.error(`[ScrapeQueue] Error scraping ${job.gameName}:`, error);
      }

      currentJobId = null;

      // Small delay between jobs to be nice to BGG
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    isProcessing = false;
    currentJobId = null;
    stopRequested = false;
    console.log("[ScrapeQueue] Worker idle.");
  }
}
