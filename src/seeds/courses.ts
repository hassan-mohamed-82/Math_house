import { db } from "../models/connection";
import { courses, courseTeachers } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedCourses(
    categoryMap: Record<string, string>,
    semesterMap: Record<string, string>,
    teacherMap: Record<string, string>
) {
    const courseMap: Record<string, string> = {};

    const coursesData = [
        {
            name: "Algebra Basics",
            category: "Primary 1",
            semester: "Primary 1 - Semester 1",
            teacher: "Ahmed Hassan",
            duration: "3 months",
            price: 200,
            discount: 20,
            description: "Introduction to basic algebra for primary students",
            preRequisition: "None",
            whatYouGain: "Basic algebra skills",
        },
        {
            name: "Geometry Fundamentals",
            category: "Primary 1",
            semester: "Primary 1 - Semester 2",
            teacher: "Ahmed Hassan",
            duration: "3 months",
            price: 250,
            discount: 0,
            description: "Learn shapes, areas, and basic geometry",
            preRequisition: "Algebra Basics",
            whatYouGain: "Geometry problem-solving skills",
        },
        {
            name: "Equations & Inequalities",
            category: "Prep 1",
            semester: "Prep 1 - Semester 1",
            teacher: "Sara Mohamed",
            duration: "4 months",
            price: 350,
            discount: 50,
            description: "Solving equations and inequalities",
            preRequisition: "Algebra Basics",
            whatYouGain: "Equation solving mastery",
        },
        {
            name: "Trigonometry",
            category: "Secondary 1",
            semester: "Secondary 1 - Semester 1",
            teacher: "Mohamed Ali",
            duration: "4 months",
            price: 400,
            discount: 0,
            description: "Complete trigonometry course",
            preRequisition: "Geometry Fundamentals",
            whatYouGain: "Trigonometric functions and identities",
        },
        {
            name: "IGCSE Mathematics",
            category: "IG Year 1",
            semester: "IG Year 1 - Semester 1",
            teacher: "Fatma Ibrahim",
            duration: "6 months",
            price: 600,
            discount: 100,
            description: "Full IGCSE Mathematics syllabus",
            preRequisition: "None",
            whatYouGain: "IGCSE exam readiness",
        },
    ];

    for (const c of coursesData) {
        const existing = await db.select().from(courses).where(eq(courses.name, c.name));

        if (existing.length > 0) {
            courseMap[c.name] = existing[0].id;
            console.log(`  Course "${c.name}" already exists`);
            continue;
        }

        const id = uuidv4();

        await db.insert(courses).values({
            id,
            name: c.name,
            categoryId: categoryMap[c.category],
            semesterId: semesterMap[c.semester] || undefined,
            duration: c.duration,
            price: c.price,
            discount: c.discount,
            description: c.description,
            preRequisition: c.preRequisition,
            whatYouGain: c.whatYouGain,
        });

        // Link teacher to course
        if (teacherMap[c.teacher]) {
            await db.insert(courseTeachers).values({
                courseId: id,
                teacherId: teacherMap[c.teacher],
                role: "instructor",
            });
        }

        courseMap[c.name] = id;
        console.log(`  ✅ Course "${c.name}" created`);
    }

    return courseMap;
}
