import { seedRoles } from "./roles";
import { seedAdmins } from "./admins";
import { seedCategories } from "./categories";
import { seedTeachers } from "./teachers";
import { seedSemesters } from "./semesters";
import { seedCourses } from "./courses";
import { seedChapters } from "./chapters";
import { seedLessons } from "./lessons";
import { seedStudents } from "./students";
import { seedParents } from "./parents";
import { seedExamCodes } from "./examCodes";
import { seedQuestions } from "./questions";
import { pool } from "../models/connection";

async function main() {
    try {
        console.log("🌱 Seeding database...\n");

        // 1. Roles & Admins
        console.log("📋 Seeding Roles...");
        const roleId = await seedRoles();

        console.log("\n👤 Seeding Admins...");
        await seedAdmins(roleId);

        // 2. Categories (hierarchical - must be before teachers, semesters, courses)
        console.log("\n📂 Seeding Categories...");
        const categoryMap = await seedCategories();

        // 3. Teachers (depends on categories)
        console.log("\n👨‍🏫 Seeding Teachers...");
        const teacherMap = await seedTeachers(categoryMap);

        // 4. Semesters (depends on categories)
        console.log("\n📅 Seeding Semesters...");
        const semesterMap = await seedSemesters(categoryMap);

        // 5. Courses + CourseTeachers (depends on categories, semesters, teachers)
        console.log("\n📚 Seeding Courses...");
        const courseMap = await seedCourses(categoryMap, semesterMap, teacherMap);

        // 6. Chapters (depends on courses, categories, teachers)
        console.log("\n📖 Seeding Chapters...");
        const chapterMap = await seedChapters(courseMap, categoryMap, teacherMap);

        // 7. Lessons & Ideas (depends on chapters, courses, categories, teachers)
        console.log("\n📝 Seeding Lessons & Ideas...");
        await seedLessons(chapterMap, courseMap, categoryMap, teacherMap);

        // 8. Students (depends on categories)
        console.log("\n🎓 Seeding Students...");
        await seedStudents(categoryMap);

        // 9. Parents
        console.log("\n👪 Seeding Parents...");
        await seedParents();

        // 10. Exam Codes
        console.log("\n🏷️ Seeding Exam Codes...");
        await seedExamCodes();

        // 11. Questions (depends on lessons, exam codes)
        console.log("\n❓ Seeding Questions...");
        await seedQuestions();

        console.log("\n✅ Seeding completed successfully!");
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
