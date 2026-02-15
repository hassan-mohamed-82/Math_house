"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedQuestions = seedQuestions;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedQuestions() {
    // 1. Get a Lesson (e.g., "Introduction to Numbers" or just the first one)
    const existingLesson = await connection_1.db.select().from(schema_1.lessons).limit(1);
    if (!existingLesson || existingLesson.length === 0) {
        console.log("  ⚠️ No lessons found. Skipping question seeding.");
        return;
    }
    const lessonId = existingLesson[0].id;
    // 2. Get an Exam Code (e.g., "Generic" or just the first one)
    const existingCode = await connection_1.db.select().from(schema_1.examCodes).limit(1);
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
        const existing = await connection_1.db.select().from(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.question, q.question));
        if (existing.length > 0) {
            console.log(`  Question "${q.question}" already exists`);
            continue;
        }
        const questionId = (0, uuid_1.v4)();
        // 1. Insert Question
        await connection_1.db.insert(schema_1.questions).values({
            id: questionId,
            question: q.question,
            answerType: q.answerType,
            difficulty: q.difficulty,
            questionType: q.questionType,
            lessonId: q.lessonId,
            year: q.year,
            month: q.month,
            section: q.section,
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
            await connection_1.db.insert(schema_1.questionOptions).values(formattedOptions);
        }
        console.log(`  ✅ Question created: "${q.question}" (ID: ${questionId})`);
    }
}
