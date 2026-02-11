import { db } from "../models/connection";
import { chapters } from "../models/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedChapters(
    courseMap: Record<string, string>,
    categoryMap: Record<string, string>,
    teacherMap: Record<string, string>
): Promise<Record<string, string>> {
    const chapterMap: Record<string, string> = {};

    const chaptersData = [
        // Algebra Basics chapters
        { name: "Numbers & Operations", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", duration: "2 weeks", price: 50, discount: 5, order: 1 },
        { name: "Variables & Expressions", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", duration: "2 weeks", price: 50, discount: 5, order: 2 },
        { name: "Simple Equations", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", duration: "3 weeks", price: 60, discount: 0, order: 3 },

        // Geometry Fundamentals chapters
        { name: "Lines & Angles", course: "Geometry Fundamentals", category: "Primary 1", teacher: "Ahmed Hassan", duration: "2 weeks", price: 60, discount: 0, order: 1 },
        { name: "Triangles & Polygons", course: "Geometry Fundamentals", category: "Primary 1", teacher: "Ahmed Hassan", duration: "3 weeks", price: 70, discount: 10, order: 2 },

        // Equations & Inequalities chapters
        { name: "Linear Equations", course: "Equations & Inequalities", category: "Prep 1", teacher: "Sara Mohamed", duration: "3 weeks", price: 80, discount: 10, order: 1 },
        { name: "Quadratic Equations", course: "Equations & Inequalities", category: "Prep 1", teacher: "Sara Mohamed", duration: "3 weeks", price: 90, discount: 0, order: 2 },

        // Trigonometry chapters
        { name: "Angle Measures", course: "Trigonometry", category: "Secondary 1", teacher: "Mohamed Ali", duration: "2 weeks", price: 100, discount: 0, order: 1 },
        { name: "Sine, Cosine & Tangent", course: "Trigonometry", category: "Secondary 1", teacher: "Mohamed Ali", duration: "4 weeks", price: 120, discount: 20, order: 2 },

        // IGCSE Mathematics chapters
        { name: "Number Theory", course: "IGCSE Mathematics", category: "IG Year 1", teacher: "Fatma Ibrahim", duration: "3 weeks", price: 100, discount: 0, order: 1 },
        { name: "Algebra & Graphs", course: "IGCSE Mathematics", category: "IG Year 1", teacher: "Fatma Ibrahim", duration: "4 weeks", price: 120, discount: 15, order: 2 },
        { name: "Statistics & Probability", course: "IGCSE Mathematics", category: "IG Year 1", teacher: "Fatma Ibrahim", duration: "3 weeks", price: 110, discount: 0, order: 3 },
    ];

    for (const ch of chaptersData) {
        const courseId = courseMap[ch.course];
        const categoryId = categoryMap[ch.category];
        const teacherId = teacherMap[ch.teacher];

        if (!courseId || !categoryId || !teacherId) {
            console.log(`  ⚠️ Skipping chapter "${ch.name}" - missing reference`);
            continue;
        }

        const existing = await db.select().from(chapters)
            .where(eq(chapters.name, ch.name));

        // Skip if chapter with same name already exists for this course
        if (existing.length > 0 && existing.some(e => e.courseId === courseId)) {
            chapterMap[ch.name] = existing.find(e => e.courseId === courseId)!.id;
            console.log(`  Chapter "${ch.name}" already exists`);
            continue;
        }

        const id = uuidv4();
        await db.insert(chapters).values({
            id,
            name: ch.name,
            courseId,
            categoryId,
            teacherId,
            duration: ch.duration,
            price: ch.price,
            discount: ch.discount,
            order: ch.order,
        });

        chapterMap[ch.name] = id;
        console.log(`  ✅ Chapter "${ch.name}" created (order: ${ch.order})`);
    }

    return chapterMap;
}
