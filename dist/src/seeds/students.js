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
async function seedStudents(categoryMap) {
    const studentsData = [
        { firstname: "Omar", lastname: "Khaled", nickname: "OmarK", email: "omar.k@student.com", phone: "01112345671", category: "Primary 1", grade: "1", parentphone: "01011111111" },
        { firstname: "Nour", lastname: "Ahmed", nickname: "NourA", email: "nour.a@student.com", phone: "01112345672", category: "Primary 2", grade: "2", parentphone: "01022222222" },
        { firstname: "Youssef", lastname: "Salem", nickname: "YoussefS", email: "youssef.s@student.com", phone: "01112345673", category: "Prep 1", grade: "7", parentphone: "01033333333" },
        { firstname: "Mariam", lastname: "Fathy", nickname: "MariamF", email: "mariam.f@student.com", phone: "01112345674", category: "Secondary 1", grade: "10", parentphone: "01044444444" },
        { firstname: "Ali", lastname: "Hassan", nickname: "AliH", email: "ali.h@student.com", phone: "01112345675", category: "IG Year 1", grade: "10", parentphone: "01055555555" },
    ];
    const hashedPassword = await bcrypt_1.default.hash("student123", 10);
    for (const s of studentsData) {
        const existing = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.email, s.email));
        if (existing.length > 0) {
            console.log(`  Student "${s.firstname} ${s.lastname}" already exists`);
            continue;
        }
        await connection_1.db.insert(schema_1.Student).values({
            id: (0, uuid_1.v4)(),
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
