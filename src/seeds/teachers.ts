import { db } from "../models/connection";
import { teachers } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export async function seedTeachers(categoryMap: Record<string, string>) {
    const teacherMap: Record<string, string> = {};

    const teachersData = [
        { name: "Ahmed Hassan", email: "ahmed.hassan@mathhouse.com", phone: "01001234567", category: "Primary 1" },
        { name: "Sara Mohamed", email: "sara.mohamed@mathhouse.com", phone: "01001234568", category: "Prep 1" },
        { name: "Mohamed Ali", email: "mohamed.ali@mathhouse.com", phone: "01001234569", category: "Secondary 1" },
        { name: "Fatma Ibrahim", email: "fatma.ibrahim@mathhouse.com", phone: "01001234570", category: "IG Year 1" },
    ];

    const hashedPassword = await bcrypt.hash("teacher123", 10);

    for (const t of teachersData) {
        const existing = await db.select().from(teachers).where(eq(teachers.email, t.email));

        if (existing.length > 0) {
            teacherMap[t.name] = existing[0].id;
            console.log(`  Teacher "${t.name}" already exists`);
            continue;
        }

        const id = uuidv4();

        await db.insert(teachers).values({
            id,
            name: t.name,
            email: t.email,
            phoneNumber: t.phone,
            password: hashedPassword,
            categoryId: categoryMap[t.category] || null,
        });

        teacherMap[t.name] = id;
        console.log(`  ✅ Teacher "${t.name}" created`);
    }

    return teacherMap;
}
