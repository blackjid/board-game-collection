export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Scheduler] Initializing background sync scheduler...");

    // Import sync functions dynamically to avoid bundling issues
    const { isSyncDue, runScheduledSync } = await import("@/lib/sync");

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

    console.log("[Scheduler] Background sync scheduler started (checking every minute).");
  }
}
