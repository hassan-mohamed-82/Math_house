"use strict";
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
const connection_1 = require("../models/connection");
async function main() {
    try {
        console.log("🌱 Seeding database...\n");
        // 1. Roles & Admins
        console.log("📋 Seeding Roles...");
        const roleId = await (0, roles_1.seedRoles)();
        console.log("\n👤 Seeding Admins...");
        await (0, admins_1.seedAdmins)(roleId);
        // 2. Categories (hierarchical - must be before teachers, semesters, courses)
        console.log("\n📂 Seeding Categories...");
        const categoryMap = await (0, categories_1.seedCategories)();
        // 3. Teachers (depends on categories)
        console.log("\n👨‍🏫 Seeding Teachers...");
        const teacherMap = await (0, teachers_1.seedTeachers)(categoryMap);
        // 4. Semesters (depends on categories)
        console.log("\n📅 Seeding Semesters...");
        const semesterMap = await (0, semesters_1.seedSemesters)(categoryMap);
        // 5. Courses + CourseTeachers (depends on categories, semesters, teachers)
        console.log("\n📚 Seeding Courses...");
        const courseMap = await (0, courses_1.seedCourses)(categoryMap, semesterMap, teacherMap);
        // 6. Chapters (depends on courses, categories, teachers)
        console.log("\n📖 Seeding Chapters...");
        const chapterMap = await (0, chapters_1.seedChapters)(courseMap, categoryMap, teacherMap);
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
        // 11. Questions (depends on lessons, exam codes)
        console.log("\n❓ Seeding Questions...");
        await (0, questions_1.seedQuestions)();
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
