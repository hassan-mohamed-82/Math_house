"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTeachers = seedTeachers;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function seedTeachers(categoryMap) {
    const teacherMap = {};
    const teachersData = [
        { name: "Ahmed Hassan", email: "ahmed.hassan@mathhouse.com", phone: "01001234567", category: "Primary 1" },
        { name: "Sara Mohamed", email: "sara.mohamed@mathhouse.com", phone: "01001234568", category: "Prep 1" },
        { name: "Mohamed Ali", email: "mohamed.ali@mathhouse.com", phone: "01001234569", category: "Secondary 1" },
        { name: "Fatma Ibrahim", email: "fatma.ibrahim@mathhouse.com", phone: "01001234570", category: "IG Year 1" },
    ];
    const hashedPassword = await bcrypt_1.default.hash("teacher123", 10);
    for (const t of teachersData) {
        const existing = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.email, t.email));
        if (existing.length > 0) {
            teacherMap[t.name] = existing[0].id;
            console.log(`  Teacher "${t.name}" already exists`);
            continue;
        }
        const id = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.teachers).values({
            id,
            name: t.name,
            email: t.email,
            phoneNumber: t.phone,
            password: hashedPassword,
            categoryId: categoryMap[t.category] || null,
        });
        teacherMap[t.name] = id;
        console.log(`  ✅ Teacher "${t.name}" created`);
    }
    return teacherMap;
}
