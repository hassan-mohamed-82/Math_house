"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedQuestions = seedQuestions;
const connection_1 = require("../models/connection");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const uuid_1 = require("uuid");
async function seedQuestions() {
    // 1. Get a Lesson
    const existingLesson = await connection_1.db.select().from(schema_1.lessons).limit(1);
    if (!existingLesson || existingLesson.length === 0) {
        console.log("  ⚠️ No lessons found. Skipping question seeding.");
        return;
    }
    const lessonId = existingLesson[0].id;
    // 2. Get an Exam Code
    const existingCode = await connection_1.db.select().from(schema_1.examCodes).limit(1);
    if (!existingCode || existingCode.length === 0) {
        console.log("  ⚠️ No exam codes found. Skipping question seeding.");
        return;
    }
    const codeId = existingCode[0].id;
    // 3. Get a Section
    const existingSection = await connection_1.db.select().from(schema_1.Sections).limit(1);
    if (!existingSection || existingSection.length === 0) {
        console.log("  ⚠️ No sections found. Skipping question seeding.");
        return;
    }
    const sectionId = existingSection[0].id;
    console.log("  Generating 100 questions...");
    const questionsToInsert = [];
    for (let i = 1; i <= 100; i++) {
        questionsToInsert.push({
            question: `Question ${i}: Solve for x in ${i}x + 10 = 20`,
            answerType: "MCQ",
            difficulty: ["A", "B", "C", "D", "E"][i % 5],
            questionType: i % 2 === 0 ? "Trail" : "Extra",
            lessonId: lessonId,
            year: 2024,
            month: ["Jan", "Feb", "Mar", "Apr", "May"][i % 5],
            sectionId: sectionId,
            codeId: codeId,
        });
    }
    for (const q of questionsToInsert) {
        const questionId = (0, uuid_1.v4)();
        // Check if question exists (simple check to avoid constraints errors if re-running without clean)
        const existing = await connection_1.db.select().from(schema_1.questions).where((0, drizzle_orm_1.eq)(schema_1.questions.question, q.question));
        if (existing.length > 0)
            continue;
        // 1. Insert Question
        await connection_1.db.insert(schema_1.questions).values({
            id: questionId,
            ...q
        });
        // 2. Insert Options
        const options = [
            { questionId, answer: "5", isCorrect: true, order: "A" },
            { questionId, answer: "10", isCorrect: false, order: "B" },
            { questionId, answer: "15", isCorrect: false, order: "C" },
            { questionId, answer: "20", isCorrect: false, order: "D" },
        ];
        await connection_1.db.insert(schema_1.questionOptions).values(options);
        // 3. Create a Parallel Question
        const parallelQuestionId = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.ParallelQuestion).values({
            id: parallelQuestionId,
            origianlQuestionId: questionId,
            question: `Parallel to Q${q.question}: What is ${q.question}?`,
            answerType: "MCQ",
            difficulty: q.difficulty,
            lessonId: q.lessonId,
        });
        const parallelOptions = [
            { questionId: parallelQuestionId, answer: "5", isCorrect: true, order: "A" },
            { questionId: parallelQuestionId, answer: "10", isCorrect: false, order: "B" },
        ];
        await connection_1.db.insert(schema_1.ParallelQuestionOptions).values(parallelOptions);
    }
    console.log(`  ✅ Successfully seeded ${questionsToInsert.length} questions and parallel questions.`);
}
