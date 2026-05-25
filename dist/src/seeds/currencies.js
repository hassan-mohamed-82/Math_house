"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCurrencies = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const axios_1 = __importDefault(require("axios"));
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest/USD";
const SEED_CURRENCIES = [
    { name: "US Dollar", symbol: "$", code: "USD", isBase: true },
    { name: "Euro", symbol: "€", code: "EUR", isBase: false },
    { name: "British Pound", symbol: "£", code: "GBP", isBase: false },
    { name: "Egyptian Pound", symbol: "ج.م", code: "EGP", isBase: false },
    { name: "Saudi Riyal", symbol: "ر.س", code: "SAR", isBase: false },
    { name: "UAE Dirham", symbol: "د.إ", code: "AED", isBase: false },
];
const seedCurrencies = async () => {
    // Fetch live rates from the free API
    let liveRates = {};
    try {
        console.log("  🌐 Fetching live exchange rates from API...");
        const response = await axios_1.default.get(EXCHANGE_RATE_API_URL);
        if (response.data.result === "success") {
            liveRates = response.data.rates;
            console.log(`  ✅ Fetched ${Object.keys(liveRates).length} live rates (base: USD)`);
        }
    }
    catch (error) {
        console.warn("  ⚠️ Could not fetch live rates, using fallback rate of 1.000000");
    }
    for (const currency of SEED_CURRENCIES) {
        const existing = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.code, currency.code));
        if (existing.length === 0) {
            const rate = currency.isBase ? "1.000000" : (liveRates[currency.code]?.toFixed(6) || "1.000000");
            await connection_1.db.insert(schema_1.Currency).values({
                ...currency,
                exchangeRate: rate,
            });
            console.log(`  ✅ Seeded currency: ${currency.code} (${currency.name}) — rate: ${rate}`);
        }
        else {
            // Update existing currency with live rate
            if (!currency.isBase && liveRates[currency.code]) {
                const rate = liveRates[currency.code].toFixed(6);
                await connection_1.db.update(schema_1.Currency).set({ exchangeRate: rate }).where((0, drizzle_orm_1.eq)(schema_1.Currency.code, currency.code));
                console.log(`  🔄 Updated ${currency.code} rate to ${rate}`);
            }
            else {
                console.log(`  ⏭️  Currency ${currency.code} already exists, skipping`);
            }
        }
    }
};
exports.seedCurrencies = seedCurrencies;
