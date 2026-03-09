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
    const hashedPassword = await bcrypt_1.default.hash("password123", 10);
    const seedAdminsData = [
        {
            name: "Admin",
            email: "admin@admin.com",
            phoneNumber: "1234567890",
            type: "admin",
        },
        {
            name: "Super Admin",
            email: "superadmin@admin.com",
            phoneNumber: "1234567891",
            type: "super_admin",
        },
    ];
    for (const adminData of seedAdminsData) {
        const existingAdmin = await connection_1.db.select().from(schema_1.admins).where((0, drizzle_orm_1.eq)(schema_1.admins.email, adminData.email));
        if (existingAdmin.length > 0) {
            console.log(`${adminData.type} account already exists`);
            continue;
        }
        await connection_1.db.insert(schema_1.admins).values({
            name: adminData.name,
            email: adminData.email,
            password: hashedPassword,
            phoneNumber: adminData.phoneNumber,
            roleId,
            type: adminData.type,
            status: "active"
        });
        console.log(`${adminData.type} account created successfully`);
    }
}
