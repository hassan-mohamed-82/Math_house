"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = seedRoles;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedRoles() {
    const existingRole = await connection_1.db.select().from(schema_1.roles).where((0, drizzle_orm_1.eq)(schema_1.roles.name, "admin"));
    if (existingRole.length > 0) {
        return existingRole[0].id;
    }
    const newRoleId = (0, uuid_1.v4)();
    await connection_1.db.insert(schema_1.roles).values({
        id: newRoleId,
        name: "admin",
        permissions: [],
        status: "active"
    });
    return newRoleId;
}
