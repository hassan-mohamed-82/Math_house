import { db } from "../models/connection";
import { questions, questionOptions, lessons, examCodes } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedQuestions() {
    // 1. Get a Lesson (e.g., "Introduction to Numbers" or just the first one)
    const existingLesson = await db.select().from(lessons).limit(1);
    if (!existingLesson || existingLesson.length === 0) {
        console.log("  ⚠️ No lessons found. Skipping question seeding.");
        return;
    }
    const lessonId = existingLesson[0].id;

    // 2. Get an Exam Code (e.g., "Generic" or just the first one)
    const existingCode = await db.select().from(examCodes).limit(1);
    if (!existingCode || existingCode.length === 0) {
        console.log("  ⚠️ No exam codes found. Skipping question seeding.");
        return;
    }
    const codeId = existingCode[0].id;

    const questionsData = [
        {
            question: "Example Question for Parallel Generation: If 2x + 10 = 20, what is x?",
            answerType: "MCQ",
            difficulty: "A", // Changed from "Easy" to "A" to match schema
            questionType: "Extra", // Changed to valid enum value
            lessonId: lessonId,
            year: 2024,
            month: "Jan",
            section: "1", // Changed from "Math" to "1" to match schema
            codeId: codeId,
            options: [
                { answer: "5", isCorrect: true, order: "A" },
                { answer: "10", isCorrect: false, order: "B" },
                { answer: "15", isCorrect: false, order: "C" },
            ]
        }
    ];

    for (const q of questionsData) {
        // Check if question exists (by text for simplicity in seeding)
        const existing = await db.select().from(questions).where(eq(questions.question, q.question));

        if (existing.length > 0) {
            console.log(`  Question "${q.question}" already exists`);
            continue;
        }

        const questionId = uuidv4();

        // 1. Insert Question
        await db.insert(questions).values({
            id: questionId,
            question: q.question,
            answerType: q.answerType as any,
            difficulty: q.difficulty as any,
            questionType: q.questionType as any,
            lessonId: q.lessonId,
            year: q.year as any,
            month: q.month as any,
            section: q.section as any,
            codeId: q.codeId,
        });

        // 2. Insert Options
        if (q.options && q.options.length > 0) {
            const formattedOptions = q.options.map((opt) => ({
                questionId: questionId,
                answer: opt.answer,
                isCorrect: opt.isCorrect,
                order: opt.order,
            }));
            await db.insert(questionOptions).values(formattedOptions);
        }

        console.log(`  ✅ Question created: "${q.question}" (ID: ${questionId})`);
    }
}
