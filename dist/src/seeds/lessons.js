"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedLessons = seedLessons;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedLessons(chapterMap, courseMap, categoryMap, teacherMap) {
    const lessonsData = [
        // Numbers & Operations lessons
        {
            name: "Introduction to Numbers", chapter: "Numbers & Operations", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", price: 20, discount: 0, order: 1,
            ideas: [
                { idea: "Natural Numbers", order: 1 },
                { idea: "Whole Numbers", order: 2 },
                { idea: "Number Line", order: 3 },
            ]
        },
        {
            name: "Addition & Subtraction", chapter: "Numbers & Operations", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", price: 20, discount: 5, order: 2,
            ideas: [
                { idea: "Adding Single Digits", order: 1 },
                { idea: "Carrying Over", order: 2 },
            ]
        },
        {
            name: "Multiplication Basics", chapter: "Numbers & Operations", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", price: 25, discount: 0, order: 3,
            ideas: [
                { idea: "Times Tables", order: 1 },
                { idea: "Multiplication Properties", order: 2 },
            ]
        },
        // Variables & Expressions lessons
        {
            name: "What is a Variable?", chapter: "Variables & Expressions", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", price: 20, discount: 0, order: 1,
            ideas: [
                { idea: "Defining Variables", order: 1 },
                { idea: "Variable Notation", order: 2 },
            ]
        },
        {
            name: "Building Expressions", chapter: "Variables & Expressions", course: "Algebra Basics", category: "Primary 1", teacher: "Ahmed Hassan", price: 25, discount: 0, order: 2,
            ideas: [
                { idea: "Terms and Coefficients", order: 1 },
                { idea: "Combining Like Terms", order: 2 },
                { idea: "Simplifying Expressions", order: 3 },
            ]
        },
        // Lines & Angles lessons
        {
            name: "Types of Lines", chapter: "Lines & Angles", course: "Geometry Fundamentals", category: "Primary 1", teacher: "Ahmed Hassan", price: 25, discount: 0, order: 1,
            ideas: [
                { idea: "Parallel Lines", order: 1 },
                { idea: "Perpendicular Lines", order: 2 },
                { idea: "Intersecting Lines", order: 3 },
            ]
        },
        {
            name: "Measuring Angles", chapter: "Lines & Angles", course: "Geometry Fundamentals", category: "Primary 1", teacher: "Ahmed Hassan", price: 25, discount: 5, order: 2,
            ideas: [
                { idea: "Acute Angles", order: 1 },
                { idea: "Right Angles", order: 2 },
                { idea: "Obtuse Angles", order: 3 },
            ]
        },
        // Linear Equations lessons
        {
            name: "Solving One-Step Equations", chapter: "Linear Equations", course: "Equations & Inequalities", category: "Prep 1", teacher: "Sara Mohamed", price: 30, discount: 0, order: 1,
            ideas: [
                { idea: "Addition Equations", order: 1 },
                { idea: "Subtraction Equations", order: 2 },
            ]
        },
        {
            name: "Solving Two-Step Equations", chapter: "Linear Equations", course: "Equations & Inequalities", category: "Prep 1", teacher: "Sara Mohamed", price: 35, discount: 5, order: 2,
            ideas: [
                { idea: "Order of Operations", order: 1 },
                { idea: "Inverse Operations", order: 2 },
                { idea: "Checking Solutions", order: 3 },
            ]
        },
        // Angle Measures lessons
        {
            name: "Degrees and Radians", chapter: "Angle Measures", course: "Trigonometry", category: "Secondary 1", teacher: "Mohamed Ali", price: 40, discount: 0, order: 1,
            ideas: [
                { idea: "Degree Measurement", order: 1 },
                { idea: "Radian Measurement", order: 2 },
                { idea: "Converting Between Units", order: 3 },
            ]
        },
        // Number Theory lessons
        {
            name: "Prime Numbers", chapter: "Number Theory", course: "IGCSE Mathematics", category: "IG Year 1", teacher: "Fatma Ibrahim", price: 40, discount: 0, order: 1,
            ideas: [
                { idea: "Identifying Primes", order: 1 },
                { idea: "Prime Factorization", order: 2 },
            ]
        },
        {
            name: "HCF and LCM", chapter: "Number Theory", course: "IGCSE Mathematics", category: "IG Year 1", teacher: "Fatma Ibrahim", price: 40, discount: 5, order: 2,
            ideas: [
                { idea: "Finding HCF", order: 1 },
                { idea: "Finding LCM", order: 2 },
                { idea: "Word Problems", order: 3 },
            ]
        },
    ];
    for (const lesson of lessonsData) {
        const chapterId = chapterMap[lesson.chapter];
        const courseId = courseMap[lesson.course];
        const categoryId = categoryMap[lesson.category];
        const teacherId = teacherMap[lesson.teacher];
        if (!chapterId || !courseId || !categoryId || !teacherId) {
            console.log(`  ⚠️ Skipping lesson "${lesson.name}" - missing reference`);
            continue;
        }
        const existing = await connection_1.db.select().from(schema_1.lessons)
            .where((0, drizzle_orm_1.eq)(schema_1.lessons.name, lesson.name));
        if (existing.length > 0 && existing.some(e => e.chapterId === chapterId)) {
            const existingLesson = existing.find(e => e.chapterId === chapterId);
            console.log(`  Lesson "${lesson.name}" already exists`);
            // Still seed ideas if lesson exists
            await seedIdeasForLesson(existingLesson.id, lesson.ideas);
            continue;
        }
        const lessonId = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.lessons).values({
            id: lessonId,
            name: lesson.name,
            chapterId,
            courseId,
            categoryId,
            teacherId,
            price: lesson.price,
            discount: lesson.discount,
            order: lesson.order,
        });
        console.log(`  ✅ Lesson "${lesson.name}" created (order: ${lesson.order})`);
        // Seed ideas for this lesson
        await seedIdeasForLesson(lessonId, lesson.ideas);
    }
}
async function seedIdeasForLesson(lessonId, ideas) {
    for (const ideaData of ideas) {
        const existing = await connection_1.db.select().from(schema_1.lessonIdeas)
            .where((0, drizzle_orm_1.eq)(schema_1.lessonIdeas.lessonId, lessonId));
        if (existing.some(e => e.idea === ideaData.idea)) {
            continue;
        }
        await connection_1.db.insert(schema_1.lessonIdeas).values({
            id: (0, uuid_1.v4)(),
            lessonId,
            idea: ideaData.idea,
            ideaOrder: ideaData.order,
        });
        console.log(`    💡 Idea "${ideaData.idea}" created (order: ${ideaData.order})`);
    }
}
