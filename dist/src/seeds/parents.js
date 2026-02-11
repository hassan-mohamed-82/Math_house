"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedParents = seedParents;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function seedParents() {
    const parentsData = [
        { name: "Khaled Omar", email: "khaled.omar@parent.com", phone: "01011111111" },
        { name: "Ahmed Nour", email: "ahmed.nour@parent.com", phone: "01022222222" },
        { name: "Salem Youssef", email: "salem.youssef@parent.com", phone: "01033333333" },
        { name: "Fathy Mariam", email: "fathy.mariam@parent.com", phone: "01044444444" },
        { name: "Hassan Ali", email: "hassan.ali@parent.com", phone: "01055555555" },
    ];
    const hashedPassword = await bcrypt_1.default.hash("parent123", 10);
    for (const p of parentsData) {
        const existing = await connection_1.db.select().from(schema_1.parents).where((0, drizzle_orm_1.eq)(schema_1.parents.email, p.email));
        if (existing.length > 0) {
            console.log(`  Parent "${p.name}" already exists`);
            continue;
        }
        await connection_1.db.insert(schema_1.parents).values({
            id: (0, uuid_1.v4)(),
            name: p.name,
            email: p.email,
            phoneNumber: p.phone,
            password: hashedPassword,
            status: "active",
        });
        console.log(`  ✅ Parent "${p.name}" created`);
    }
}
