import { seedRoles } from "./roles";
import { seedAdmins } from "./admins";
import { seedCategories } from "./categories";
import { seedTeachers } from "./teachers";
import { seedSemesters } from "./semesters";
import { seedCourses } from "./courses";
import { seedChapters } from "./chapters";
import { seedStudents } from "./students";
import { seedParents } from "./parents";
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
        await seedChapters(courseMap, categoryMap, teacherMap);

        // 7. Students (depends on categories)
        console.log("\n🎓 Seeding Students...");
        await seedStudents(categoryMap);

        // 8. Parents
        console.log("\n👪 Seeding Parents...");
        await seedParents();

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
