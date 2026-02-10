
import { db } from "../models/connection";
import { admins } from "../models/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function seedAdmins(roleId: string) {
    const existingAdmin = await db.select().from(admins).where(eq(admins.email, "admin@admin.com"));

    if (existingAdmin.length > 0) {
        console.log("Admin already exists");
        return;
    }

    const hashedPassword = await bcrypt.hash("password123", 10);

    await db.insert(admins).values({
        name: "Admin",
        email: "admin@admin.com",
        password: hashedPassword,
        phoneNumber: "1234567890",
        roleId: roleId,
        status: "active"
    });

    console.log("Admin created successfully");
}
