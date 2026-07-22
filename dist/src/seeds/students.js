"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedStudents = seedStudents;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function seedStudents(categoryMap, gradeMap) {
    const studentsData = [
        { firstname: "Omar", lastname: "Khaled", nickname: "OmarK", email: "omar.k@student.com", phone: "01112345671", category: "National Learning", grade: "Primary-1", parentphone: "01011111111" },
        { firstname: "Nour", lastname: "Ahmed", nickname: "NourA", email: "nour.a@student.com", phone: "01112345672", category: "National Learning", grade: "Primary-2", parentphone: "01022222222" },
        { firstname: "Youssef", lastname: "Salem", nickname: "YoussefS", email: "youssef.s@student.com", phone: "01112345673", category: "National Learning", grade: "Middle-7", parentphone: "01033333333" },
        { firstname: "Mariam", lastname: "Fathy", nickname: "MariamF", email: "mariam.f@student.com", phone: "01112345674", category: "National Learning", grade: "Secondary-10", parentphone: "01044444444" },
        { firstname: "Ali", lastname: "Hassan", nickname: "AliH", email: "ali.h@student.com", phone: "01112345675", category: "International Learning", grade: "IGCSE-10", parentphone: "01055555555" },
        { firstname: "Mazen", lastname: "Khairy", nickname: "MazenK", email: "mazenkhairy200@gmail.com", phone: "01112345676", category: "National Learning", grade: "Secondary-10", parentphone: "01066666666" },
    ];
    const hashedPassword = await bcrypt_1.default.hash("student123", 10);
    for (const s of studentsData) {
        const targetCategoryId = categoryMap[s.category];
        const targetGradeId = gradeMap[s.grade];
        if (!targetCategoryId || !targetGradeId) {
            console.warn(`  ⚠️ Category "${s.category}" or Grade "${s.grade}" not found for student ${s.firstname}`);
            continue;
        }
        const existing = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.email, s.email));
        if (existing.length > 0) {
            if (existing[0].category !== targetCategoryId || existing[0].grade !== targetGradeId || !existing[0].isVerified) {
                await connection_1.db
                    .update(schema_1.Student)
                    .set({
                    category: targetCategoryId,
                    grade: targetGradeId,
                    parentphone: s.parentphone,
                    phone: s.phone,
                    isVerified: true
                })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, existing[0].id));
                console.log(`  ✅ Updated data for existing student "${s.firstname} ${s.lastname}"`);
            }
            const existingWallet = await connection_1.db
                .select()
                .from(schema_1.wallet)
                .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, existing[0].id));
            if (existingWallet.length === 0) {
                await connection_1.db.insert(schema_1.wallet).values({
                    studentId: existing[0].id,
                    balance: 0,
                });
                console.log(`  ✅ Wallet created for existing student "${s.firstname} ${s.lastname}"`);
            }
            else if (existing[0].category === targetCategoryId) {
                console.log(`  Student "${s.firstname} ${s.lastname}" already exists`);
            }
            continue;
        }
        const studentId = (0, uuid_1.v4)();
        await connection_1.db.transaction(async (tx) => {
            await tx.insert(schema_1.Student).values({
                id: studentId,
                firstname: s.firstname,
                lastname: s.lastname,
                nickname: s.nickname,
                email: s.email,
                password: hashedPassword,
                phone: s.phone,
                category: targetCategoryId,
                grade: targetGradeId,
                parentphone: s.parentphone,
                isVerified: true,
            });
            await tx.insert(schema_1.wallet).values({
                studentId,
                balance: 0,
            });
        });
        console.log(`  ✅ Student "${s.firstname} ${s.lastname}" created with wallet`);
    }
}
