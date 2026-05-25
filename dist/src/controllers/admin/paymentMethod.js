"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectionCurrency = exports.getPaymentMethodById = exports.getAllPaymentMethods = exports.deletePaymentMethod = exports.updatePaymentMethod = exports.createPaymentMethod = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const crypto_1 = __importDefault(require("crypto"));
const handleImages_1 = require("../../utils/handleImages");
const createPaymentMethod = async (req, res) => {
    const { name, description, type, isActive, currencies, logo } = req.body;
    if (!name || !description || !type || !logo) {
        throw new BadRequest_1.BadRequest("Name, description, type, and logo are required");
    }
    if (type !== "Manual" && type !== "Automatic") {
        throw new BadRequest_1.BadRequest("Invalid type");
    }
    const imageUrl = await (0, handleImages_1.validateAndSaveLogo)(req, logo, "payment_methods");
    const newId = crypto_1.default.randomUUID();
    await connection_1.db.insert(schema_1.paymentMethod).values({
        id: newId,
        name,
        description,
        type,
        logo: imageUrl,
        isActive: isActive !== undefined ? isActive : true,
    });
    if (currencies && Array.isArray(currencies) && currencies.length > 0) {
        const existingCurrencies = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.inArray)(schema_1.Currency.id, currencies));
        if (existingCurrencies.length !== currencies.length) {
            throw new BadRequest_1.BadRequest("One or more currencies do not exist");
        }
        const currencyValues = currencies.map((c) => ({
            paymentMethodId: newId,
            currencyId: c,
        }));
        await connection_1.db.insert(schema_1.paymentMethodCurrency).values(currencyValues);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Payment method created successfully" }, 201);
};
exports.createPaymentMethod = createPaymentMethod;
const updatePaymentMethod = async (req, res) => {
    const { id } = req.params;
    const { name, description, type, isActive, currencies, logo } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Payment method id is required");
    }
    const existing = await connection_1.db.select().from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Payment method not found");
    }
    const updatedLogoUrl = await (0, handleImages_1.handleImageUpdate)(req, existing[0].logo, logo, "payment_methods");
    await connection_1.db.update(schema_1.paymentMethod).set({
        name: name || existing[0].name,
        description: description || existing[0].description,
        type: type || existing[0].type,
        logo: updatedLogoUrl,
        isActive: isActive !== undefined ? isActive : existing[0].isActive,
    }).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, id));
    if (currencies && Array.isArray(currencies)) {
        if (currencies.length > 0) {
            const existingCurrencies = await connection_1.db.select().from(schema_1.Currency).where((0, drizzle_orm_1.inArray)(schema_1.Currency.id, currencies));
            if (existingCurrencies.length !== currencies.length) {
                throw new BadRequest_1.BadRequest("One or more currencies do not exist");
            }
        }
        await connection_1.db.delete(schema_1.paymentMethodCurrency).where((0, drizzle_orm_1.eq)(schema_1.paymentMethodCurrency.paymentMethodId, id));
        if (currencies.length > 0) {
            const currencyValues = currencies.map((c) => ({
                paymentMethodId: id,
                currencyId: c,
            }));
            await connection_1.db.insert(schema_1.paymentMethodCurrency).values(currencyValues);
        }
    }
    return (0, response_1.SuccessResponse)(res, { message: "Payment method updated successfully" }, 200);
};
exports.updatePaymentMethod = updatePaymentMethod;
const deletePaymentMethod = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Payment method id is required");
    }
    const existing = await connection_1.db.select().from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Payment method not found");
    }
    if (existing[0].logo) {
        await (0, handleImages_1.deleteImage)(existing[0].logo);
    }
    await connection_1.db.delete(schema_1.paymentMethodCurrency).where((0, drizzle_orm_1.eq)(schema_1.paymentMethodCurrency.paymentMethodId, id));
    await connection_1.db.delete(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Payment method deleted successfully" }, 200);
};
exports.deletePaymentMethod = deletePaymentMethod;
const getAllPaymentMethods = async (req, res) => {
    const methods = await connection_1.db.select().from(schema_1.paymentMethod);
    const methodCurrencies = await connection_1.db
        .select({
        paymentMethodId: schema_1.paymentMethodCurrency.paymentMethodId,
        currency: schema_1.Currency
    })
        .from(schema_1.paymentMethodCurrency)
        .leftJoin(schema_1.Currency, (0, drizzle_orm_1.eq)(schema_1.paymentMethodCurrency.currencyId, schema_1.Currency.id));
    const data = methods.map(method => ({
        ...method,
        currencies: methodCurrencies
            .filter(mc => mc.paymentMethodId === method.id)
            .map(mc => mc.currency)
            .filter(c => c !== null)
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Payment methods fetched successfully", data }, 200);
};
exports.getAllPaymentMethods = getAllPaymentMethods;
const getPaymentMethodById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Payment method id is required");
    }
    const existing = await connection_1.db.select().from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, id));
    if (existing.length === 0) {
        throw new BadRequest_1.BadRequest("Payment method not found");
    }
    const methodCurrencies = await connection_1.db
        .select({
        currency: schema_1.Currency
    })
        .from(schema_1.paymentMethodCurrency)
        .leftJoin(schema_1.Currency, (0, drizzle_orm_1.eq)(schema_1.paymentMethodCurrency.currencyId, schema_1.Currency.id))
        .where((0, drizzle_orm_1.eq)(schema_1.paymentMethodCurrency.paymentMethodId, id));
    const data = {
        ...existing[0],
        currencies: methodCurrencies.map(mc => mc.currency).filter(c => c !== null)
    };
    return (0, response_1.SuccessResponse)(res, { message: "Payment method fetched successfully", data }, 200);
};
exports.getPaymentMethodById = getPaymentMethodById;
const getSelectionCurrency = async (req, res) => {
    const currencies = await connection_1.db.select().from(schema_1.Currency);
    const data = currencies.map(currency => ({
        id: currency.id,
        name: currency.name,
        symbol: currency.symbol,
        code: currency.code,
        exchangeRate: currency.exchangeRate,
        isBase: currency.isBase,
    }));
    return (0, response_1.SuccessResponse)(res, { message: "Currencies fetched successfully", data }, 200);
};
exports.getSelectionCurrency = getSelectionCurrency;
