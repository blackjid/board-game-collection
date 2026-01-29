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
  retryCount: number;
  maxRetries: number;
  batchId?: string | null;
}

export interface BatchStats {
  id: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
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
  // Batch-specific stats for active batch
  currentBatch: BatchStats | null;
}

// Worker state (in-memory, but jobs are in DB)
let isProcessing = false;
let currentJobId: string | null = null;
let stopRequested = false;
let currentBatchId: string | null = null;

// How many days to keep completed jobs
const JOB_RETENTION_DAYS = 7;

// Default max retries for failed jobs
const DEFAULT_MAX_RETRIES = 3;

// Delay between retries (exponential backoff base)
const RETRY_DELAY_BASE_MS = 2000;

/**
 * Generate a unique batch ID
 */
function generateBatchId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Add a game to the scrape queue
 * @param gameId - The BGG game ID
 * @param gameName - The game name for display
 * @param batchId - Optional batch ID to group jobs together
 */
export async function enqueueScrape(
  gameId: string,
  gameName: string,
  batchId?: string
): Promise<ScrapeJob> {
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

  // Use provided batch ID, current active batch, or generate new one
  const effectiveBatchId = batchId ?? currentBatchId ?? generateBatchId();

  // Create new job
  const job = await prisma.scrapeJob.create({
    data: {
      gameId,
      gameName,
      status: "pending",
      batchId: effectiveBatchId,
      maxRetries: DEFAULT_MAX_RETRIES,
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
 * All jobs in a batch share the same batchId for tracking
 */
export async function enqueueScrapeMany(games: Array<{ id: string; name: string }>): Promise<ScrapeJob[]> {
  // Generate a new batch ID for this group of jobs
  const batchId = generateBatchId();
  currentBatchId = batchId;

  const jobs: ScrapeJob[] = [];

  for (const game of games) {
    const job = await enqueueScrape(game.id, game.name, batchId);
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
 * Get current queue status with batch-aware statistics
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  // Find the active batch (has pending or processing jobs)
  const activeBatchJob = await prisma.scrapeJob.findFirst({
    where: { status: { in: ["pending", "processing"] } },
    select: { batchId: true },
    orderBy: { createdAt: "desc" },
  });

  const activeBatchId = activeBatchJob?.batchId ?? currentBatchId;

  // Get batch-specific stats if we have an active batch
  let currentBatch: BatchStats | null = null;
  if (activeBatchId) {
    const batchJobs = await prisma.scrapeJob.groupBy({
      by: ["status"],
      where: { batchId: activeBatchId },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const group of batchJobs) {
      statusCounts[group.status] = group._count;
      total += group._count;
    }

    currentBatch = {
      id: activeBatchId,
      total,
      completed: statusCounts["completed"] ?? 0,
      failed: statusCounts["failed"] ?? 0,
      pending: statusCounts["pending"] ?? 0,
      processing: statusCounts["processing"] ?? 0,
    };
  }

  // Get global counts and recent jobs
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
    currentBatch,
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
 * Handle a failed job - either retry or mark as permanently failed
 */
async function handleJobFailure(
  jobId: string,
  gameName: string,
  errorMessage: string,
  currentRetryCount: number,
  maxRetries: number
): Promise<void> {
  if (currentRetryCount < maxRetries) {
    // Schedule for retry - increment retry count and reset to pending
    const newRetryCount = currentRetryCount + 1;
    const retryDelay = RETRY_DELAY_BASE_MS * Math.pow(2, currentRetryCount); // 2s, 4s, 8s...

    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "pending",
        retryCount: newRetryCount,
        error: `Attempt ${currentRetryCount + 1} failed: ${errorMessage}`,
        startedAt: null,
      },
    });

    console.log(
      `[ScrapeQueue] Will retry ${gameName} (attempt ${newRetryCount + 1}/${maxRetries + 1}) after ${retryDelay}ms`
    );

    // Add delay before retry
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  } else {
    // Max retries exceeded - mark as permanently failed
    await prisma.scrapeJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: `Failed after ${maxRetries + 1} attempts: ${errorMessage}`,
        completedAt: new Date(),
      },
    });

    console.log(
      `[ScrapeQueue] Permanently failed: ${gameName} (exhausted ${maxRetries + 1} attempts)`
    );
  }
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
      currentBatchId = job.batchId;

      // Mark as processing
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: "processing",
          startedAt: new Date(),
        },
      });

      const retryInfo = job.retryCount > 0 ? ` (retry ${job.retryCount}/${job.maxRetries})` : "";
      console.log(`[ScrapeQueue] Processing: ${job.gameName} (${job.gameId})${retryInfo}`);

      try {
        const success = await scrapeGame(job.gameId);

        if (success) {
          await prisma.scrapeJob.update({
            where: { id: job.id },
            data: {
              status: "completed",
              completedAt: new Date(),
              error: null, // Clear any previous error
            },
          });
          console.log(`[ScrapeQueue] Completed: ${job.gameName}`);
        } else {
          // Scrape returned false - handle as failure with possible retry
          await handleJobFailure(
            job.id,
            job.gameName,
            "Scrape returned false",
            job.retryCount,
            job.maxRetries
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ScrapeQueue] Error scraping ${job.gameName}:`, error);

        // Handle failure with possible retry
        await handleJobFailure(
          job.id,
          job.gameName,
          errorMessage,
          job.retryCount,
          job.maxRetries
        );
      }

      currentJobId = null;

      // Small delay between jobs to be nice to BGG
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    isProcessing = false;
    currentJobId = null;
    currentBatchId = null;
    stopRequested = false;
    console.log("[ScrapeQueue] Worker idle.");
  }
}
