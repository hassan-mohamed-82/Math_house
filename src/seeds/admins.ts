import { db } from "../models/connection";
import { admins, roles } from "../models/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

export const seedAdmins = async () => {
    console.log("Seeding admins...");

    // Find the Super Admin role
    const superAdminRole = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, "Super Admin"),
    });

    if (!superAdminRole) {
        console.error("Super Admin role not found. Please seed roles first.");
        return;
    }

    const password = await bcrypt.hash("password123", 10);

    const devAdmin = {
        nickname: "Dev Admin",
        name: "Dev Admin",
        email: "dev@mathshouse.com",
        phoneNumber: "1234567890",
        password: password,
        roleId: superAdminRole.id,
        type: "admin" as "admin",
        status: "active" as "active",
    };

    // Check if Dev Admin exists
    const existingDevAdmin = await db.query.admins.findFirst({
        where: (admins, { eq }) => eq(admins.email, "dev@mathshouse.com"),
    });

    if (!existingDevAdmin) {
        await db.insert(admins).values(devAdmin);
        console.log("Dev Admin created.");
    } else {
        console.log("Dev Admin already exists.");
    }

    console.log("Admins seeding completed.");
};
