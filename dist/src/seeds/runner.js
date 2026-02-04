"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../models/connection");
const roles_1 = require("./roles");
const admins_1 = require("./admins");
const runSeeds = async () => {
    try {
        console.log("Starting seeding process...");
        await (0, roles_1.seedRoles)();
        await (0, admins_1.seedAdmins)();
        console.log("Seeding completed successfully.");
    }
    catch (error) {
        console.error("Seeding failed:", error);
    }
    finally {
        await connection_1.pool.end();
        console.log("Database connection closed.");
    }
};
runSeeds();
