import cron from "node-cron";
import { refreshExchangeRates } from "./cronServices/currencyCron";

export const startCronJobs = () => {
    // Schedule: Every day at 00:00 (Midnight)
    // Format: "minute hour day-of-month month day-of-week"
    cron.schedule("0 0 * * *", async () => {
        console.log("--- Triggering Daily Cron Jobs ---");
    });

    console.log("🕒 Cron Jobs Initialized");
};

export const startCurrencyCron = () => {
    // Run once on server startup
    refreshExchangeRates();

    // Then every 6 hours
    cron.schedule("0 */6 * * *", () => {
        console.log("🔄 [CurrencyCron] Scheduled rate refresh starting...");
        refreshExchangeRates();
    });

    console.log("⏰ [CurrencyCron] Exchange rate auto-refresh scheduled (every 6 hours)");
};