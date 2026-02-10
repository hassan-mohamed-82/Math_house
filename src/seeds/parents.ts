import { db } from "../models/connection";
import { parents } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export async function seedParents() {
    const parentsData = [
        { name: "Khaled Omar", email: "khaled.omar@parent.com", phone: "01011111111" },
        { name: "Ahmed Nour", email: "ahmed.nour@parent.com", phone: "01022222222" },
        { name: "Salem Youssef", email: "salem.youssef@parent.com", phone: "01033333333" },
        { name: "Fathy Mariam", email: "fathy.mariam@parent.com", phone: "01044444444" },
        { name: "Hassan Ali", email: "hassan.ali@parent.com", phone: "01055555555" },
    ];

    const hashedPassword = await bcrypt.hash("parent123", 10);

    for (const p of parentsData) {
        const existing = await db.select().from(parents).where(eq(parents.email, p.email));

        if (existing.length > 0) {
            console.log(`  Parent "${p.name}" already exists`);
            continue;
        }

        await db.insert(parents).values({
            id: uuidv4(),
            name: p.name,
            email: p.email,
            phoneNumber: p.phone,
            password: hashedPassword,
            status: "active",
        });

        console.log(`  ✅ Parent "${p.name}" created`);
    }
}
