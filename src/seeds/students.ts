import { db } from "../models/connection";
import { Student } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export async function seedStudents(categoryMap: Record<string, string>) {
    const studentsData = [
        { firstname: "Omar", lastname: "Khaled", nickname: "OmarK", email: "omar.k@student.com", phone: "01112345671", category: "Primary 1", grade: "1" as const, parentphone: "01011111111" },
        { firstname: "Nour", lastname: "Ahmed", nickname: "NourA", email: "nour.a@student.com", phone: "01112345672", category: "Primary 2", grade: "2" as const, parentphone: "01022222222" },
        { firstname: "Youssef", lastname: "Salem", nickname: "YoussefS", email: "youssef.s@student.com", phone: "01112345673", category: "Prep 1", grade: "7" as const, parentphone: "01033333333" },
        { firstname: "Mariam", lastname: "Fathy", nickname: "MariamF", email: "mariam.f@student.com", phone: "01112345674", category: "Secondary 1", grade: "10" as const, parentphone: "01044444444" },
        { firstname: "Ali", lastname: "Hassan", nickname: "AliH", email: "ali.h@student.com", phone: "01112345675", category: "IG Year 1", grade: "10" as const, parentphone: "01055555555" },
    ];

    const hashedPassword = await bcrypt.hash("student123", 10);

    for (const s of studentsData) {
        const existing = await db.select().from(Student).where(eq(Student.email, s.email));

        if (existing.length > 0) {
            console.log(`  Student "${s.firstname} ${s.lastname}" already exists`);
            continue;
        }

        await db.insert(Student).values({
            id: uuidv4(),
            firstname: s.firstname,
            lastname: s.lastname,
            nickname: s.nickname,
            email: s.email,
            password: hashedPassword,
            phone: s.phone,
            category: categoryMap[s.category],
            grade: s.grade,
            parentphone: s.parentphone,
        });

        console.log(`  ✅ Student "${s.firstname} ${s.lastname}" created`);
    }
}
