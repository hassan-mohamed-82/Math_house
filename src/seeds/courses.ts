import { db } from "../models/connection";
import { courses, courseTeachers } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedCourses(
    categoryMap: Record<string, string>,
    teacherMap: Record<string, string>
) {
    const courseMap: Record<string, string> = {};

    const coursesData = [
        {
            name: "Primary 1",
            category: "Primary",
            isHaveSemester: true,
            teacher: "Ahmed Hassan",
            duration: "9 months",
            price: 500,
            discount: 50,
            description: "Full mathematics curriculum for Primary 1",
            preRequisition: "None",
            whatYouGain: "Fundamental arithmetic and numbers",
        },
        {
            name: "Middle 1",
            category: "Middle",
            isHaveSemester: true,
            teacher: "Sara Mohamed",
            duration: "9 months",
            price: 600,
            discount: 50,
            description: "Full mathematics curriculum for Middle 1",
            preRequisition: "Primary 6",
            whatYouGain: "Algebra basics and geometry introduction",
        },
        {
            name: "Middle 2",
            category: "Middle",
            isHaveSemester: true,
            teacher: "Sara Mohamed",
            duration: "9 months",
            price: 650,
            discount: 50,
            description: "Full mathematics curriculum for Middle 2",
            preRequisition: "Middle 1",
            whatYouGain: "Equations, inequalities, and advanced geometry",
        },
        {
            name: "Secondary 1",
            category: "Secondary",
            isHaveSemester: true,
            teacher: "Mohamed Ali",
            duration: "9 months",
            price: 800,
            discount: 0,
            description: "Full mathematics curriculum for Secondary 1",
            preRequisition: "Middle 3",
            whatYouGain: "Advanced trigonometry and calculus basics",
        },
        {
            name: "IG Year 1",
            category: "IGCSE",
            isHaveSemester: true,
            teacher: "Fatma Ibrahim",
            duration: "9 months",
            price: 1200,
            discount: 100,
            description: "IGCSE Mathematics syllabus preparation",
            preRequisition: "None",
            whatYouGain: "IGCSE Foundation",
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
            isHaveSemester: c.isHaveSemester,
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
