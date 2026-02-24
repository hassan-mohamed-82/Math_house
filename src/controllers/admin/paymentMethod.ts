import { Request, Response } from "express";
import { db } from "../../models/connection";
import { paymentMethod, paymentMethodCurrency, Currency } from "../../models/schema";
import { eq, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import crypto from "crypto";
import { validateAndSaveLogo, handleImageUpdate, deleteImage } from "../../utils/handleImages";

export const createPaymentMethod = async (req: Request, res: Response) => {
    const { name, description, type, isActive, currencies, logo } = req.body;

    if (!name || !description || !type || !logo) {
        throw new BadRequest("Name, description, type, and logo are required");
    }
    if (type !== "Manual" && type !== "Automatic") {
        throw new BadRequest("Invalid type");
    }
    const imageUrl = await validateAndSaveLogo(req, logo, "payment_methods");

    const newId = crypto.randomUUID();

    await db.insert(paymentMethod).values({
        id: newId,
        name,
        description,
        type,
        logo: imageUrl,
        isActive: isActive !== undefined ? isActive : true,
    });

    if (currencies && Array.isArray(currencies) && currencies.length > 0) {
        const existingCurrencies = await db.select().from(Currency).where(inArray(Currency.id, currencies));
        if (existingCurrencies.length !== currencies.length) {
            throw new BadRequest("One or more currencies do not exist");
        }

        const currencyValues = currencies.map((c: string) => ({
            paymentMethodId: newId,
            currencyId: c,
        }));
        await db.insert(paymentMethodCurrency).values(currencyValues);
    }

    return SuccessResponse(res, { message: "Payment method created successfully" }, 201);
};

export const updatePaymentMethod = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, type, isActive, currencies, logo } = req.body;

    if (!id) {
        throw new BadRequest("Payment method id is required");
    }

    const existing = await db.select().from(paymentMethod).where(eq(paymentMethod.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Payment method not found");
    }

    const updatedLogoUrl = await handleImageUpdate(req, existing[0].logo, logo, "payment_methods");

    await db.update(paymentMethod).set({
        name: name || existing[0].name,
        description: description || existing[0].description,
        type: type || existing[0].type,
        logo: updatedLogoUrl as string,
        isActive: isActive !== undefined ? isActive : existing[0].isActive,
    }).where(eq(paymentMethod.id, id));

    if (currencies && Array.isArray(currencies)) {
        if (currencies.length > 0) {
            const existingCurrencies = await db.select().from(Currency).where(inArray(Currency.id, currencies));
            if (existingCurrencies.length !== currencies.length) {
                throw new BadRequest("One or more currencies do not exist");
            }
        }

        await db.delete(paymentMethodCurrency).where(eq(paymentMethodCurrency.paymentMethodId, id));
        if (currencies.length > 0) {
            const currencyValues = currencies.map((c: string) => ({
                paymentMethodId: id,
                currencyId: c,
            }));
            await db.insert(paymentMethodCurrency).values(currencyValues);
        }
    }

    return SuccessResponse(res, { message: "Payment method updated successfully" }, 200);
};

export const deletePaymentMethod = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Payment method id is required");
    }

    const existing = await db.select().from(paymentMethod).where(eq(paymentMethod.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Payment method not found");
    }

    if (existing[0].logo) {
        await deleteImage(existing[0].logo);
    }

    await db.delete(paymentMethodCurrency).where(eq(paymentMethodCurrency.paymentMethodId, id));
    await db.delete(paymentMethod).where(eq(paymentMethod.id, id));

    return SuccessResponse(res, { message: "Payment method deleted successfully" }, 200);
};

export const getAllPaymentMethods = async (req: Request, res: Response) => {
    const methods = await db.select().from(paymentMethod);
    const methodCurrencies = await db
        .select({
            paymentMethodId: paymentMethodCurrency.paymentMethodId,
            currency: Currency
        })
        .from(paymentMethodCurrency)
        .leftJoin(Currency, eq(paymentMethodCurrency.currencyId, Currency.id));

    const data = methods.map(method => ({
        ...method,
        currencies: methodCurrencies
            .filter(mc => mc.paymentMethodId === method.id)
            .map(mc => mc.currency)
            .filter(c => c !== null)
    }));

    return SuccessResponse(res, { message: "Payment methods fetched successfully", data }, 200);
};

export const getPaymentMethodById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest("Payment method id is required");
    }

    const existing = await db.select().from(paymentMethod).where(eq(paymentMethod.id, id));
    if (existing.length === 0) {
        throw new BadRequest("Payment method not found");
    }

    const methodCurrencies = await db
        .select({
            currency: Currency
        })
        .from(paymentMethodCurrency)
        .leftJoin(Currency, eq(paymentMethodCurrency.currencyId, Currency.id))
        .where(eq(paymentMethodCurrency.paymentMethodId, id));

    const data = {
        ...existing[0],
        currencies: methodCurrencies.map(mc => mc.currency).filter(c => c !== null)
    };

    return SuccessResponse(res, { message: "Payment method fetched successfully", data }, 200);
};

export const getSelectionCurrency = async (req: Request, res: Response) => {
    const currencies = await db.select().from(Currency);
    const data = currencies.map(currency => ({
        id: currency.id,
        name: currency.name,
        symbol: currency.symbol,
        code: currency.code,
        exchangeRate: currency.exchangeRate,
        isBase: currency.isBase,
    }));
    return SuccessResponse(res, { message: "Currencies fetched successfully", data }, 200);
};