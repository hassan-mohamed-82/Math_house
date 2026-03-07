import { db } from "../models/connection";
import { Student, wallet } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export async function seedStudents(categoryMap: Record<string, string>) {
    const studentsData = [
        { firstname: "Omar", lastname: "Khaled", nickname: "OmarK", email: "omar.k@student.com", phone: "01112345671", category: "National Learning", grade: "1" as const, parentphone: "01011111111" },
        { firstname: "Nour", lastname: "Ahmed", nickname: "NourA", email: "nour.a@student.com", phone: "01112345672", category: "National Learning", grade: "2" as const, parentphone: "01022222222" },
        { firstname: "Youssef", lastname: "Salem", nickname: "YoussefS", email: "youssef.s@student.com", phone: "01112345673", category: "National Learning", grade: "7" as const, parentphone: "01033333333" },
        { firstname: "Mariam", lastname: "Fathy", nickname: "MariamF", email: "mariam.f@student.com", phone: "01112345674", category: "National Learning", grade: "10" as const, parentphone: "01044444444" },
        { firstname: "Ali", lastname: "Hassan", nickname: "AliH", email: "ali.h@student.com", phone: "01112345675", category: "International Learning", grade: "10" as const, parentphone: "01055555555" },
        { firstname: "Mazen", lastname: "Khairy", nickname: "MazenK", email: "mazenkhairy200@gmail.com", phone: "01112345676", category: "National Learning", grade: "10" as const, parentphone: "01066666666" },
    ];

    const hashedPassword = await bcrypt.hash("student123", 10);

    for (const s of studentsData) {
        const targetCategoryId = categoryMap[s.category];
        const existing = await db.select().from(Student).where(eq(Student.email, s.email));

        if (existing.length > 0) {
            if (existing[0].category !== targetCategoryId || !existing[0].isVerified) {
                await db
                    .update(Student)
                    .set({ category: targetCategoryId, grade: s.grade, parentphone: s.parentphone, phone: s.phone, isVerified: true })
                    .where(eq(Student.id, existing[0].id));

                console.log(`  ✅ Updated data for existing student "${s.firstname} ${s.lastname}"`);
            }

            const existingWallet = await db
                .select()
                .from(wallet)
                .where(eq(wallet.studentId, existing[0].id));

            if (existingWallet.length === 0) {
                await db.insert(wallet).values({
                    studentId: existing[0].id,
                    balance: 0,
                });

                console.log(`  ✅ Wallet created for existing student "${s.firstname} ${s.lastname}"`);
            } else if (existing[0].category === targetCategoryId) {
                console.log(`  Student "${s.firstname} ${s.lastname}" already exists`);
            }

            continue;
        }

        const studentId = uuidv4();

        await db.transaction(async (tx) => {
            await tx.insert(Student).values({
                id: studentId,
                firstname: s.firstname,
                lastname: s.lastname,
                nickname: s.nickname,
                email: s.email,
                password: hashedPassword,
                phone: s.phone,
                category: targetCategoryId,
                grade: s.grade,
                parentphone: s.parentphone,
                isVerified: true,
            });

            await tx.insert(wallet).values({
                studentId,
                balance: 0,
            });
        });

        console.log(`  ✅ Student "${s.firstname} ${s.lastname}" created with wallet`);
    }
}
