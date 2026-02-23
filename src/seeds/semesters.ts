import { db } from "../models/connection";
import { semesters } from "../models/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedSemesters(courseMap: Record<string, string>) {
    const semesterMap: Record<string, string> = {};

    // Courses that we know have semesters based on our courses seed
    const semesterCourses = [
        "Primary 1",
        "Middle 1",
        "Middle 2",
        "Secondary 1",
        "IG Year 1"
    ];

    for (const courseName of semesterCourses) {
        const courseId = courseMap[courseName];
        if (!courseId) continue;

        for (const semName of ["Semester 1", "Semester 2"]) {
            const key = `${courseName} - ${semName}`;

            const existing = await db.select().from(semesters)
                .where(and(eq(semesters.name, semName), eq(semesters.courseId, courseId)));

            if (existing.length > 0) {
                semesterMap[key] = existing[0].id;
                console.log(`  Semester "${key}" already exists`);
                continue;
            }

            const id = uuidv4();

            await db.insert(semesters).values({
                id,
                name: semName,
                courseId,
            });

            semesterMap[key] = id;
            console.log(`  ✅ Semester "${key}" created`);
        }
    }

    return semesterMap;
}
