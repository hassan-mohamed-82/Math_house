"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdmins = void 0;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const bcrypt_1 = __importDefault(require("bcrypt"));
const seedAdmins = async () => {
    console.log("Seeding admins...");
    // Find the Super Admin role
    const superAdminRole = await connection_1.db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, "Super Admin"),
    });
    if (!superAdminRole) {
        console.error("Super Admin role not found. Please seed roles first.");
        return;
    }
    const password = await bcrypt_1.default.hash("password123", 10);
    const devAdmin = {
        nickname: "Dev Admin",
        name: "Dev Admin",
        email: "dev@mathshouse.com",
        phoneNumber: "1234567890",
        password: password,
        roleId: superAdminRole.id,
        type: "admin",
        status: "active",
    };
    // Check if Dev Admin exists
    const existingDevAdmin = await connection_1.db.query.admins.findFirst({
        where: (admins, { eq }) => eq(admins.email, "dev@mathshouse.com"),
    });
    if (!existingDevAdmin) {
        await connection_1.db.insert(schema_1.admins).values(devAdmin);
        console.log("Dev Admin created.");
    }
    else {
        console.log("Dev Admin already exists.");
    }
    console.log("Admins seeding completed.");
};
exports.seedAdmins = seedAdmins;
