export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Scheduler] Initializing background services...");

    // Import functions dynamically to avoid bundling issues
    const { isSyncDue, runScheduledSync } = await import("@/lib/sync");
    const { resumeInterruptedJobs, cleanupOldJobs } = await import("@/lib/scrape-queue");

    // Resume any interrupted scrape jobs from previous server run
    try {
      await resumeInterruptedJobs();
    } catch (error) {
      console.error("[ScrapeQueue] Error resuming jobs:", error);
    }

    // Check interval: every minute
    const CHECK_INTERVAL_MS = 60 * 1000;

    // Flag to prevent concurrent syncs
    let isSyncing = false;

    const checkAndSync = async () => {
      if (isSyncing) {
        console.log("[Scheduler] Sync already in progress, skipping...");
        return;
      }

      try {
        const due = await isSyncDue();
        if (due) {
          console.log("[Scheduler] Sync is due, starting...");
          isSyncing = true;
          await runScheduledSync();
          console.log("[Scheduler] Sync completed.");
        }
      } catch (error) {
        console.error("[Scheduler] Error during sync check:", error);
      } finally {
        isSyncing = false;
      }
    };

    // Run check every minute
    setInterval(checkAndSync, CHECK_INTERVAL_MS);

    // Also run an initial check after a short delay (let server fully start)
    setTimeout(checkAndSync, 10000);

    // Cleanup old scrape jobs daily (check every hour)
    setInterval(async () => {
      try {
        await cleanupOldJobs();
      } catch (error) {
        console.error("[ScrapeQueue] Error cleaning up jobs:", error);
      }
    }, 60 * 60 * 1000);

    console.log("[Scheduler] Background services started.");
  }
}
