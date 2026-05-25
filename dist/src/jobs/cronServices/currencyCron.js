"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshExchangeRates = void 0;
const axios_1 = __importDefault(require("axios"));
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest";
/**
 * Fetches live exchange rates from the free API and updates all currencies in the database.
 * Also logs each rate to the conversion_rate table for historical tracking.
 */
const refreshExchangeRates = async () => {
    try {
        // Find the base currency
        const baseCurrencyArr = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.isBase, true));
        if (baseCurrencyArr.length === 0) {
            console.warn("⚠️ [CurrencyCron] No base currency set, skipping rate refresh.");
            return;
        }
        const baseCurrency = baseCurrencyArr[0];
        const response = await axios_1.default.get(`${EXCHANGE_RATE_API_URL}/${baseCurrency.code}`);
        if (response.data.result !== "success") {
            console.error("❌ [CurrencyCron] API returned non-success result.");
            return;
        }
        const rates = response.data.rates;
        // Update all non-base currencies
        const allCurrencies = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.ne)(schema_1.Currency.isBase, true));
        let updated = 0;
        for (const currency of allCurrencies) {
            const rate = rates[currency.code];
            if (rate !== undefined) {
                await connection_1.db
                    .update(schema_1.Currency)
                    .set({ exchangeRate: rate.toFixed(6) })
                    .where((0, drizzle_orm_1.eq)(schema_1.Currency.id, currency.id));
                // Log historical rate
                await connection_1.db.insert(schema_1.ConversionRate).values({
                    fromCurrencyId: baseCurrency.id,
                    toCurrencyId: currency.id,
                    rate: rate.toFixed(6),
                });
                updated++;
            }
        }
        console.log(`✅ [CurrencyCron] Updated ${updated} currency rates (base: ${baseCurrency.code})`);
    }
    catch (error) {
        console.error("❌ [CurrencyCron] Failed to refresh exchange rates:", error);
    }
};
exports.refreshExchangeRates = refreshExchangeRates;
