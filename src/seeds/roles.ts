import { db } from "../models/connection";
import { roles } from "../models/schema/admin/roles";
import { MODULES, ACTION_NAMES } from "../types/constant";
import { Permission, PermissionAction } from "../types/custom";

export const seedRoles = async () => {
    console.log("Seeding roles...");

    const allPermissions: Permission[] = MODULES.map((module) => ({
        module,
        actions: ACTION_NAMES.map((action) => ({ action } as PermissionAction)),
    }));

    const superAdminRole = {
        name: "Super Admin",
        permissions: allPermissions,
        status: "active" as "active",
    };

    const teacherRole = {
        name: "Teacher",
        permissions: [] as Permission[], // Teachers might have specific permissions, empty for now or customize
        status: "active" as "active",
    };

    // Check if Super Admin role exists
    const existingSuperAdmin = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, "Super Admin"),
    });

    if (!existingSuperAdmin) {
        await db.insert(roles).values(superAdminRole);
        console.log("Super Admin role created.");
    } else {
        console.log("Super Admin role already exists.");
    }

    // Check if Teacher role exists
    const existingTeacher = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, "Teacher"),
    });

    if (!existingTeacher) {
        await db.insert(roles).values(teacherRole);
        console.log("Teacher role created.");
    } else {
        console.log("Teacher role already exists.");
    }

    console.log("Roles seeding completed.");
};
