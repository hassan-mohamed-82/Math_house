"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = void 0;
const connection_1 = require("../models/connection");
const roles_1 = require("../models/schema/admin/roles");
const constant_1 = require("../types/constant");
const seedRoles = async () => {
    console.log("Seeding roles...");
    const allPermissions = constant_1.MODULES.map((module) => ({
        module,
        actions: constant_1.ACTION_NAMES.map((action) => ({ action })),
    }));
    const superAdminRole = {
        name: "Super Admin",
        permissions: allPermissions,
        status: "active",
    };
    const teacherRole = {
        name: "Teacher",
        permissions: [], // Teachers might have specific permissions, empty for now or customize
        status: "active",
    };
    // Check if Super Admin role exists
    const existingSuperAdmin = await connection_1.db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, "Super Admin"),
    });
    if (!existingSuperAdmin) {
        await connection_1.db.insert(roles_1.roles).values(superAdminRole);
        console.log("Super Admin role created.");
    }
    else {
        console.log("Super Admin role already exists.");
    }
    // Check if Teacher role exists
    const existingTeacher = await connection_1.db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, "Teacher"),
    });
    if (!existingTeacher) {
        await connection_1.db.insert(roles_1.roles).values(teacherRole);
        console.log("Teacher role created.");
    }
    else {
        console.log("Teacher role already exists.");
    }
    console.log("Roles seeding completed.");
};
exports.seedRoles = seedRoles;
