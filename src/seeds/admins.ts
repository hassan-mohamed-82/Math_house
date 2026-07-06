
import { db } from "../models/connection";
import { admins } from "../models/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export async function seedAdmins(roleId: string) {
    const hashedPassword = await bcrypt.hash("password123", 10);

    const seedAdminsData = [
        {
            name: "Admin",
            email: "admin@admin.com",
            phoneNumber: "1234567890",
            type: "admin" as const,
        },
        {
            name: "Super Admin",
            email: "superadmin@admin.com",
            phoneNumber: "1234567891",
            type: "super_admin" as const,
        },
    ];

    for (const adminData of seedAdminsData) {
        const existingAdmin = await db.select().from(admins).where(eq(admins.email, adminData.email));

        if (existingAdmin.length > 0) {
            console.log(`${adminData.type} account already exists`);
            continue;
        }

        await db.insert(admins).values({
            id: uuidv4(),
            name: adminData.name,
            email: adminData.email,
            password: hashedPassword,
            phoneNumber: adminData.phoneNumber,
            roleId: adminData.type === "super_admin" ? null : roleId,
            type: adminData.type,
            status: "active",
            permissions: []
        });

        console.log(`${adminData.type} account created successfully`);
    }
}
