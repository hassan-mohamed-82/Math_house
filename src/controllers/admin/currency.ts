import { Request, Response } from "express";
import { Currency, ConversionRate } from "../../models/schema";
import { db } from "../../models/connection";
import { eq, sql, ne } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import axios from "axios";

const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest";

// ─── CRUD ──────────────────────────────────────────────

export const createCurrency = async (req: Request, res: Response) => {
    const { name, symbol, code, exchangeRate, isBase } = req.body;

    if (!name || !symbol || !code) {
        throw new BadRequest("Name, symbol, and code are required");
    }

    // Check for duplicate code
    const existing = await db.select().from(Currency).where(eq(Currency.code, code.toUpperCase()));
    if (existing.length > 0) {
        throw new BadRequest(`Currency with code '${code}' already exists`);
    }

    // If this is set as base, unset the current base
    if (isBase) {
        await db.update(Currency).set({ isBase: false }).where(eq(Currency.isBase, true));
    }

    await db.insert(Currency).values({
        name,
        symbol,
        code: code.toUpperCase(),
        exchangeRate: exchangeRate || "1.000000",
        isBase: isBase || false,
    });

    return SuccessResponse(res, { message: "Currency created successfully" }, 201);
};

export const updateCurrency = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Currency id is required");
    }

    const { name, symbol, code, exchangeRate } = req.body;

    const existing = await db.select().from(Currency).where(eq(Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Currency not found");
    }

    // If updating code, check for duplicates
    if (code) {
        const duplicate = await db
            .select()
            .from(Currency)
            .where(eq(Currency.code, code.toUpperCase()));
        if (duplicate.length > 0 && duplicate[0].id !== id) {
            throw new BadRequest(`Currency with code '${code}' already exists`);
        }
    }

    await db
        .update(Currency)
        .set({
            name: name || existing[0].name,
            symbol: symbol || existing[0].symbol,
            code: code ? code.toUpperCase() : existing[0].code,
            exchangeRate: exchangeRate || existing[0].exchangeRate,
        })
        .where(eq(Currency.id, id));

    return SuccessResponse(res, { message: "Currency updated successfully" }, 200);
};

export const deleteCurrency = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Currency id is required");
    }

    const existing = await db.select().from(Currency).where(eq(Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Currency not found");
    }

    if (existing[0].isBase) {
        throw new BadRequest("Cannot delete the base currency. Set another currency as base first.");
    }

    await db.delete(Currency).where(eq(Currency.id, id));

    return SuccessResponse(res, { message: "Currency deleted successfully" }, 200);
};

export const getAllCurrencies = async (req: Request, res: Response) => {
    const currencies = await db.select().from(Currency);

    return SuccessResponse(res, { message: "Currencies fetched successfully", data: currencies }, 200);
};

export const getCurrencyById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Currency id is required");
    }

    const existing = await db.select().from(Currency).where(eq(Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Currency not found");
    }

    return SuccessResponse(res, { message: "Currency fetched successfully", data: existing[0] }, 200);
};

// ─── BASE CURRENCY ─────────────────────────────────────

export const setBaseCurrency = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Currency id is required");
    }

    const existing = await db.select().from(Currency).where(eq(Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Currency not found");
    }

    if (existing[0].isBase) {
        throw new BadRequest("This currency is already the base currency");
    }

    // Unset current base
    await db.update(Currency).set({ isBase: false }).where(eq(Currency.isBase, true));

    // Set new base
    await db.update(Currency).set({ isBase: true, exchangeRate: "1.000000" }).where(eq(Currency.id, id));

    // Recalculate all other currencies relative to new base
    const newBaseCode = existing[0].code;
    try {
        const response = await axios.get(`${EXCHANGE_RATE_API_URL}/${newBaseCode}`);
        const rates: Record<string, number> = response.data.rates;

        const allCurrencies = await db.select().from(Currency).where(ne(Currency.id, id));

        for (const currency of allCurrencies) {
            const rate = rates[currency.code];
            if (rate !== undefined) {
                await db
                    .update(Currency)
                    .set({ exchangeRate: rate.toFixed(6) })
                    .where(eq(Currency.id, currency.id));
            }
        }
    } catch {
        // If API fails, we still set the base but rates won't be updated
        console.warn("⚠️ Failed to fetch rates for the new base currency. Rates may be outdated.");
    }

    return SuccessResponse(res, { message: `Base currency changed to ${existing[0].name}` }, 200);
};

// ─── LIVE RATES ────────────────────────────────────────

export const fetchLiveRates = async (req: Request, res: Response) => {
    // Find the current base currency
    const baseCurrencyArr = await db.select().from(Currency).where(eq(Currency.isBase, true));
    if (baseCurrencyArr.length === 0) {
        throw new BadRequest("No base currency is set. Please set a base currency first.");
    }

    const baseCurrency = baseCurrencyArr[0];

    const response = await axios.get(`${EXCHANGE_RATE_API_URL}/${baseCurrency.code}`);
    if (response.data.result !== "success") {
        throw new BadRequest("Failed to fetch exchange rates from the API");
    }

    const rates: Record<string, number> = response.data.rates;

    // Update all non-base currencies
    const allCurrencies = await db.select().from(Currency).where(ne(Currency.isBase, true));

    const updatedCurrencies: { code: string; rate: number }[] = [];

    for (const currency of allCurrencies) {
        const rate = rates[currency.code];
        if (rate !== undefined) {
            await db
                .update(Currency)
                .set({ exchangeRate: rate.toFixed(6) })
                .where(eq(Currency.id, currency.id));

            // Log to conversion_rate table
            await db.insert(ConversionRate).values({
                fromCurrencyId: baseCurrency.id,
                toCurrencyId: currency.id,
                rate: rate.toFixed(6),
            });

            updatedCurrencies.push({ code: currency.code, rate });
        }
    }

    return SuccessResponse(
        res,
        {
            message: "Exchange rates updated successfully",
            data: {
                base: baseCurrency.code,
                lastUpdated: response.data.time_last_update_utc,
                rates: updatedCurrencies,
            },
        },
        200
    );
};

// ─── CONVERT ───────────────────────────────────────────

export const convert = async (req: Request, res: Response) => {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
        throw new BadRequest("Amount, from (currency id), and to (currency id) are required");
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new BadRequest("Amount must be a positive number");
    }

    const fromCurrencyArr = await db.select().from(Currency).where(eq(Currency.id, from));
    if (fromCurrencyArr.length === 0) {
        throw new BadRequest("Source currency not found");
    }

    const toCurrencyArr = await db.select().from(Currency).where(eq(Currency.id, to));
    if (toCurrencyArr.length === 0) {
        throw new BadRequest("Target currency not found");
    }

    const fromCurrency = fromCurrencyArr[0];
    const toCurrency = toCurrencyArr[0];

    // Convert via base: amount_in_base = amount / fromRate, result = amount_in_base * toRate
    const fromRate = parseFloat(fromCurrency.exchangeRate);
    const toRate = parseFloat(toCurrency.exchangeRate);

    if (fromRate === 0) {
        throw new BadRequest("Source currency exchange rate is zero — cannot convert");
    }

    const amountInBase = Number(amount) / fromRate;
    const convertedAmount = amountInBase * toRate;

    return SuccessResponse(
        res,
        {
            message: "Conversion successful",
            data: {
                from: {
                    id: fromCurrency.id,
                    code: fromCurrency.code,
                    name: fromCurrency.name,
                    symbol: fromCurrency.symbol,
                },
                to: {
                    id: toCurrency.id,
                    code: toCurrency.code,
                    name: toCurrency.name,
                    symbol: toCurrency.symbol,
                },
                amount: Number(amount),
                convertedAmount: parseFloat(convertedAmount.toFixed(6)),
                rate: parseFloat((toRate / fromRate).toFixed(6)),
            },
        },
        200
    );
};
