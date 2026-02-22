"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convert = exports.fetchLiveRates = exports.setBaseCurrency = exports.getCurrencyById = exports.getAllCurrencies = exports.deleteCurrency = exports.updateCurrency = exports.createCurrency = void 0;
const schema_1 = require("../../models/schema");
const connection_1 = require("../../models/connection");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const axios_1 = __importDefault(require("axios"));
const EXCHANGE_RATE_API_URL = "https://open.er-api.com/v6/latest";
// ─── CRUD ──────────────────────────────────────────────
const createCurrency = async (req, res) => {
    const { name, symbol, code, exchangeRate, isBase } = req.body;
    if (!name || !symbol || !code) {
        throw new BadRequest_1.BadRequest("Name, symbol, and code are required");
    }
    // Check for duplicate code
    const existing = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.code, code.toUpperCase()));
    if (existing.length > 0) {
        throw new BadRequest_1.BadRequest(`Currency with code '${code}' already exists`);
    }
    // If this is set as base, unset the current base
    if (isBase) {
        await connection_1.db.update(schema_1.Currency).set({ isBase: false }).where((0, drizzle_orm_1.eq)(schema_1.Currency.isBase, true));
    }
    await connection_1.db.insert(schema_1.Currency).values({
        name,
        symbol,
        code: code.toUpperCase(),
        exchangeRate: exchangeRate || "1.000000",
        isBase: isBase || false,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Currency created successfully" }, 201);
};
exports.createCurrency = createCurrency;
const updateCurrency = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Currency id is required");
    }
    const { name, symbol, code, exchangeRate } = req.body;
    const existing = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Currency not found");
    }
    // If updating code, check for duplicates
    if (code) {
        const duplicate = await connection_1.db
            .select()
            .from(schema_1.Currency)
            .where((0, drizzle_orm_1.eq)(schema_1.Currency.code, code.toUpperCase()));
        if (duplicate.length > 0 && duplicate[0].id !== id) {
            throw new BadRequest_1.BadRequest(`Currency with code '${code}' already exists`);
        }
    }
    await connection_1.db
        .update(schema_1.Currency)
        .set({
        name: name || existing[0].name,
        symbol: symbol || existing[0].symbol,
        code: code ? code.toUpperCase() : existing[0].code,
        exchangeRate: exchangeRate || existing[0].exchangeRate,
    })
        .where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Currency updated successfully" }, 200);
};
exports.updateCurrency = updateCurrency;
const deleteCurrency = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Currency id is required");
    }
    const existing = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Currency not found");
    }
    if (existing[0].isBase) {
        throw new BadRequest_1.BadRequest("Cannot delete the base currency. Set another currency as base first.");
    }
    await connection_1.db.delete(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Currency deleted successfully" }, 200);
};
exports.deleteCurrency = deleteCurrency;
const getAllCurrencies = async (req, res) => {
    const currencies = await connection_1.db.select().from(schema_1.Currency);
    return (0, response_1.SuccessResponse)(res, { message: "Currencies fetched successfully", data: currencies }, 200);
};
exports.getAllCurrencies = getAllCurrencies;
const getCurrencyById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Currency id is required");
    }
    const existing = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Currency not found");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Currency fetched successfully", data: existing[0] }, 200);
};
exports.getCurrencyById = getCurrencyById;
// ─── BASE CURRENCY ─────────────────────────────────────
const setBaseCurrency = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Currency id is required");
    }
    const existing = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Currency not found");
    }
    if (existing[0].isBase) {
        throw new BadRequest_1.BadRequest("This currency is already the base currency");
    }
    // Unset current base
    await connection_1.db.update(schema_1.Currency).set({ isBase: false }).where((0, drizzle_orm_1.eq)(schema_1.Currency.isBase, true));
    // Set new base
    await connection_1.db.update(schema_1.Currency).set({ isBase: true, exchangeRate: "1.000000" }).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, id));
    // Recalculate all other currencies relative to new base
    const newBaseCode = existing[0].code;
    try {
        const response = await axios_1.default.get(`${EXCHANGE_RATE_API_URL}/${newBaseCode}`);
        const rates = response.data.rates;
        const allCurrencies = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.ne)(schema_1.Currency.id, id));
        for (const currency of allCurrencies) {
            const rate = rates[currency.code];
            if (rate !== undefined) {
                await connection_1.db
                    .update(schema_1.Currency)
                    .set({ exchangeRate: rate.toFixed(6) })
                    .where((0, drizzle_orm_1.eq)(schema_1.Currency.id, currency.id));
            }
        }
    }
    catch {
        // If API fails, we still set the base but rates won't be updated
        console.warn("⚠️ Failed to fetch rates for the new base currency. Rates may be outdated.");
    }
    return (0, response_1.SuccessResponse)(res, { message: `Base currency changed to ${existing[0].name}` }, 200);
};
exports.setBaseCurrency = setBaseCurrency;
// ─── LIVE RATES ────────────────────────────────────────
const fetchLiveRates = async (req, res) => {
    // Find the current base currency
    const baseCurrencyArr = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.isBase, true));
    if (baseCurrencyArr.length === 0) {
        throw new BadRequest_1.BadRequest("No base currency is set. Please set a base currency first.");
    }
    const baseCurrency = baseCurrencyArr[0];
    const response = await axios_1.default.get(`${EXCHANGE_RATE_API_URL}/${baseCurrency.code}`);
    if (response.data.result !== "success") {
        throw new BadRequest_1.BadRequest("Failed to fetch exchange rates from the API");
    }
    const rates = response.data.rates;
    // Update all non-base currencies
    const allCurrencies = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.ne)(schema_1.Currency.isBase, true));
    const updatedCurrencies = [];
    for (const currency of allCurrencies) {
        const rate = rates[currency.code];
        if (rate !== undefined) {
            await connection_1.db
                .update(schema_1.Currency)
                .set({ exchangeRate: rate.toFixed(6) })
                .where((0, drizzle_orm_1.eq)(schema_1.Currency.id, currency.id));
            // Log to conversion_rate table
            await connection_1.db.insert(schema_1.ConversionRate).values({
                fromCurrencyId: baseCurrency.id,
                toCurrencyId: currency.id,
                rate: rate.toFixed(6),
            });
            updatedCurrencies.push({ code: currency.code, rate });
        }
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Exchange rates updated successfully",
        data: {
            base: baseCurrency.code,
            lastUpdated: response.data.time_last_update_utc,
            rates: updatedCurrencies,
        },
    }, 200);
};
exports.fetchLiveRates = fetchLiveRates;
// ─── CONVERT ───────────────────────────────────────────
const convert = async (req, res) => {
    const { amount, from, to } = req.body;
    if (!amount || !from || !to) {
        throw new BadRequest_1.BadRequest("Amount, from (currency id), and to (currency id) are required");
    }
    if (isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be a positive number");
    }
    const fromCurrencyArr = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, from));
    if (fromCurrencyArr.length === 0) {
        throw new BadRequest_1.BadRequest("Source currency not found");
    }
    const toCurrencyArr = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.eq)(schema_1.Currency.id, to));
    if (toCurrencyArr.length === 0) {
        throw new BadRequest_1.BadRequest("Target currency not found");
    }
    const fromCurrency = fromCurrencyArr[0];
    const toCurrency = toCurrencyArr[0];
    // Convert via base: amount_in_base = amount / fromRate, result = amount_in_base * toRate
    const fromRate = parseFloat(fromCurrency.exchangeRate);
    const toRate = parseFloat(toCurrency.exchangeRate);
    if (fromRate === 0) {
        throw new BadRequest_1.BadRequest("Source currency exchange rate is zero — cannot convert");
    }
    const amountInBase = Number(amount) / fromRate;
    const convertedAmount = amountInBase * toRate;
    return (0, response_1.SuccessResponse)(res, {
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
    }, 200);
};
exports.convert = convert;
