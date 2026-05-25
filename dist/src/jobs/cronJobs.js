"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCurrencyCron = exports.startCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const currencyCron_1 = require("./cronServices/currencyCron");
const startCronJobs = () => {
    // Schedule: Every day at 00:00 (Midnight)
    // Format: "minute hour day-of-month month day-of-week"
    node_cron_1.default.schedule("0 0 * * *", async () => {
        console.log("--- Triggering Daily Cron Jobs ---");
    });
    console.log("🕒 Cron Jobs Initialized");
};
exports.startCronJobs = startCronJobs;
const startCurrencyCron = () => {
    // Run once on server startup
    (0, currencyCron_1.refreshExchangeRates)();
    // Then every 6 hours
    node_cron_1.default.schedule("0 */6 * * *", () => {
        console.log("🔄 [CurrencyCron] Scheduled rate refresh starting...");
        (0, currencyCron_1.refreshExchangeRates)();
    });
    console.log("⏰ [CurrencyCron] Exchange rate auto-refresh scheduled (every 6 hours)");
};
exports.startCurrencyCron = startCurrencyCron;
