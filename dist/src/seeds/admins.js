"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmins = seedAdmins;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function seedAdmins(roleId) {
    const existingAdmin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.email, "admin@admin.com"));
    if (existingAdmin.length > 0) {
        console.log("Admin already exists");
        return;
    }
    const hashedPassword = await bcrypt_1.default.hash("password123", 10);
    await connection_1.db.insert(schema_1.admins).values({
        name: "Admin",
        email: "admin@admin.com",
        password: hashedPassword,
        phoneNumber: "1234567890",
        roleId: roleId,
        status: "active"
    });
    console.log("Admin created successfully");
}
