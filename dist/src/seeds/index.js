"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const roles_1 = require("./roles");
const admins_1 = require("./admins");
const categories_1 = require("./categories");
const teachers_1 = require("./teachers");
const semesters_1 = require("./semesters");
const courses_1 = require("./courses");
const chapters_1 = require("./chapters");
const lessons_1 = require("./lessons");
const students_1 = require("./students");
const parents_1 = require("./parents");
const examCodes_1 = require("./examCodes");
const questions_1 = require("./questions");
const sections_1 = require("./sections");
const rawScore_1 = require("./rawScore");
const currencies_1 = require("./currencies");
const connection_1 = require("../models/connection");
async function main() {
    try {
        console.log("🌱 Seeding database...\n");
        // 0. Currencies (no dependencies)
        console.log("💱 Seeding Currencies...");
        await (0, currencies_1.seedCurrencies)();
        // 1. Roles & Admins
        console.log("\n📋 Seeding Roles...");
        const roleId = await (0, roles_1.seedRoles)();
        console.log("\n👤 Seeding Admins...");
        await (0, admins_1.seedAdmins)(roleId);
        // 2. Categories (hierarchical - must be before teachers, semesters, courses)
        console.log("\n📂 Seeding Categories...");
        const categoryMap = await (0, categories_1.seedCategories)();
        // 3. Teachers (depends on categories)
        console.log("\n👨‍🏫 Seeding Teachers...");
        const teacherMap = await (0, teachers_1.seedTeachers)(categoryMap);
        // 4. Courses + CourseTeachers (depends on categories, teachers)
        console.log("\n📚 Seeding Courses...");
        const courseMap = await (0, courses_1.seedCourses)(categoryMap, teacherMap);
        // 5. Semesters (depends on courses)
        console.log("\n📅 Seeding Semesters...");
        const semesterMap = await (0, semesters_1.seedSemesters)(courseMap);
        // 5.5 Raw Scores (depends on courses)
        console.log("\n📊 Seeding Raw Scores...");
        await (0, rawScore_1.seedRawScores)(courseMap);
        // 6. Chapters (depends on courses, categories, teachers, semesters)
        console.log("\n📖 Seeding Chapters...");
        const chapterMap = await (0, chapters_1.seedChapters)(courseMap, categoryMap, teacherMap, semesterMap);
        // 7. Lessons & Ideas (depends on chapters, courses, categories, teachers)
        console.log("\n📝 Seeding Lessons & Ideas...");
        await (0, lessons_1.seedLessons)(chapterMap, courseMap, categoryMap, teacherMap);
        // 8. Students (depends on categories)
        console.log("\n🎓 Seeding Students...");
        await (0, students_1.seedStudents)(categoryMap);
        // 9. Parents
        console.log("\n👪 Seeding Parents...");
        await (0, parents_1.seedParents)();
        // 10. Exam Codes
        console.log("\n🏷️ Seeding Exam Codes...");
        await (0, examCodes_1.seedExamCodes)();
        // 10.5 Sections
        console.log("\n🏷️ Seeding Sections...");
        await (0, sections_1.seedSections)();
        // 11. Questions (depends on lessons, exam codes)
        console.log("\n❓ Seeding Questions...");
        await (0, questions_1.seedQuestions)();
        // 12. Diagnostic Exams (depends on Raw Scores)
        console.log("\n📝 Seeding Diagnostic Exams...");
        const { seedDiagnosticExams } = await Promise.resolve().then(() => __importStar(require("./diagnosticExam")));
        await seedDiagnosticExams();
        // 13. Quizzes
        // console.log("\n📝 Seeding Quizzes...");
        // const { seedQuizzes } = await import("./quizzes");
        // await seedQuizzes();
        // 14. Exams
        // console.log("\n📝 Seeding Exams...");
        // const { seedExams } = await import("./exams");
        // await seedExams();
        console.log("\n✅ Seeding completed successfully!");
    }
    catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
    finally {
        await connection_1.pool.end();
        process.exit(0);
    }
}
main();
