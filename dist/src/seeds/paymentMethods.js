"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedPaymentMethods = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
const SEED_PAYMENT_METHODS = [
    { name: "Stripe", description: "Credit/Debit Card Processing", type: "Automatic", logo: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=200", isActive: true },
    { name: "Vodafone Cash", description: "Manual Vodafone Cash Transfer", type: "Manual", logo: "https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=200", isActive: true },
    { name: "InstaPay", description: "Manual Bank Transfer via InstaPay", type: "Manual", logo: "https://images.unsplash.com/photo-1610221389028-1b5eeb24fbb2?w=200", isActive: true },
    { name: "Paymob", description: "Local Payment Gateway", type: "Automatic", logo: "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=200", isActive: true },
];
const seedPaymentMethods = async () => {
    // 1. Ensure currencies exist to map them
    const allCurrencies = await connection_1.db.select().from(schema_1.Currency);
    if (allCurrencies.length === 0) {
        console.warn("  ⚠️ No currencies found, please run currency seeds first.");
        return;
    }
    // We'll map EGP to manual methods and local gateways, USD/EUR to Stripe
    const egp = allCurrencies.find((c) => c.code === "EGP");
    const usd = allCurrencies.find((c) => c.code === "USD");
    const eur = allCurrencies.find((c) => c.code === "EUR");
    for (const pm of SEED_PAYMENT_METHODS) {
        const existing = await connection_1.db.select().from(schema_1.paymentMethod).where((0, drizzle_orm_1.eq)(schema_1.paymentMethod.name, pm.name));
        let pmId;
        if (existing.length === 0) {
            pmId = crypto_1.default.randomUUID();
            await connection_1.db.insert(schema_1.paymentMethod).values({
                id: pmId,
                ...pm
            });
            console.log(`  ✅ Seeded payment method: ${pm.name}`);
        }
        else {
            pmId = existing[0].id;
            console.log(`  ⏭️  Payment method ${pm.name} already exists, skipping insert`);
        }
        // Now link currencies
        let currenciesToLink = [];
        if (pm.name === "Stripe") {
            if (usd)
                currenciesToLink.push(usd.id);
            if (eur)
                currenciesToLink.push(eur.id);
        }
        else if (pm.name === "Vodafone Cash" || pm.name === "InstaPay" || pm.name === "Paymob") {
            if (egp)
                currenciesToLink.push(egp.id);
            if (usd)
                currenciesToLink.push(usd.id);
        }
        for (const currencyId of currenciesToLink) {
            const existingLink = await connection_1.db.select().from(schema_1.paymentMethodCurrency)
                .where((0, drizzle_orm_1.eq)(schema_1.paymentMethodCurrency.paymentMethodId, pmId));
            const isLinked = existingLink.some(link => link.currencyId === currencyId);
            if (!isLinked) {
                await connection_1.db.insert(schema_1.paymentMethodCurrency).values({
                    paymentMethodId: pmId,
                    currencyId: currencyId
                });
                console.log(`    🔗 Linked currency ${allCurrencies.find((c) => c.id === currencyId)?.code} to ${pm.name}`);
            }
        }
    }
};
exports.seedPaymentMethods = seedPaymentMethods;
