import { db } from "../models/connection";
import { roles } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';

export async function seedRoles() {
    const existingRole = await db.select().from(roles).where(eq(roles.name, "admin"));

    if (existingRole.length > 0) {
        return existingRole[0].id;
    }

    const newRoleId = uuidv4();

    await db.insert(roles).values({
        id: newRoleId,
        name: "admin",
        permissions: [],
        status: "active"
    });

    return newRoleId;
}
