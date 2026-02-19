import cron from "node-cron";
import axios from "axios";
import { db } from "../../models/connection";
import { Currency, ConversionRate } from "../../models/schema";
import { eq, ne } from "drizzle-orm";

const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest";

/**
 * Fetches live exchange rates from the free API and updates all currencies in the database.
 * Also logs each rate to the conversion_rate table for historical tracking.
 */
export const refreshExchangeRates = async () => {
    try {
        // Find the base currency
        const baseCurrencyArr = await db.select().from(Currency).where(eq(Currency.isBase, true));
        if (baseCurrencyArr.length === 0) {
            console.warn("⚠️ [CurrencyCron] No base currency set, skipping rate refresh.");
            return;
        }

        const baseCurrency = baseCurrencyArr[0];
        const response = await axios.get(`${EXCHANGE_RATE_API_URL}/${baseCurrency.code}`);

        if (response.data.result !== "success") {
            console.error("❌ [CurrencyCron] API returned non-success result.");
            return;
        }

        const rates: Record<string, number> = response.data.rates;

        // Update all non-base currencies
        const allCurrencies = await db.select().from(Currency).where(ne(Currency.isBase, true));

        let updated = 0;
        for (const currency of allCurrencies) {
            const rate = rates[currency.code];
            if (rate !== undefined) {
                await db
                    .update(Currency)
                    .set({ exchangeRate: rate.toFixed(6) })
                    .where(eq(Currency.id, currency.id));

                // Log historical rate
                await db.insert(ConversionRate).values({
                    fromCurrencyId: baseCurrency.id,
                    toCurrencyId: currency.id,
                    rate: rate.toFixed(6),
                });

                updated++;
            }
        }

        console.log(`✅ [CurrencyCron] Updated ${updated} currency rates (base: ${baseCurrency.code})`);
    } catch (error) {
        console.error("❌ [CurrencyCron] Failed to refresh exchange rates:", error);
    }
};

