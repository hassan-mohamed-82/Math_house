import { db } from "../models/connection";
import { questions, questionOptions, lessons, examCodes, ParallelQuestion, ParallelQuestionOptions, Sections } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedQuestions() {
    // 1. Get a Lesson
    const existingLesson = await db.select().from(lessons).limit(1);
    if (!existingLesson || existingLesson.length === 0) {
        console.log("  ⚠️ No lessons found. Skipping question seeding.");
        return;
    }
    const lessonId = existingLesson[0].id;

    // 2. Get an Exam Code
    const existingCode = await db.select().from(examCodes).limit(1);
    if (!existingCode || existingCode.length === 0) {
        console.log("  ⚠️ No exam codes found. Skipping question seeding.");
        return;
    }
    const codeId = existingCode[0].id;

    // 3. Get a Section
    const existingSection = await db.select().from(Sections).limit(1);
    if (!existingSection || existingSection.length === 0) {
        console.log("  ⚠️ No sections found. Skipping question seeding.");
        return;
    }
    const sectionId = existingSection[0].id;

    console.log("  Generating 100 questions...");
    const questionsToInsert: any[] = [];

    for (let i = 1; i <= 100; i++) {
        const isGridIn = i % 10 === 0;

        questionsToInsert.push({
            question: `Question ${i}: Solve for x in ${i}x + 10 = 20`,
            answerType: isGridIn ? "Grid in" : "MCQ",
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
        const questionId = uuidv4();

        // Check if question exists (simple check to avoid constraints errors if re-running without clean)
        const existing = await db.select().from(questions).where(eq(questions.question, q.question));
        if (existing.length > 0) continue;

        // 1. Insert Question
        await db.insert(questions).values({
            id: questionId,
            ...q
        } as any);

        // 2. Insert Options
        let options;
        if (q.answerType === "Grid in") {
            options = [
                { questionId, answer: "10/i", isCorrect: true, order: null },
            ];
        } else {
            options = [
                { questionId, answer: "5", isCorrect: true, order: "A" },
                { questionId, answer: "10", isCorrect: false, order: "B" },
                { questionId, answer: "15", isCorrect: false, order: "C" },
                { questionId, answer: "20", isCorrect: false, order: "D" },
            ];
        }
        await db.insert(questionOptions).values(options);

        const parallelQuestionId = uuidv4();
        await db.insert(ParallelQuestion).values({
            id: parallelQuestionId,
            origianlQuestionId: questionId,
            question: `Parallel to Q${q.question}: What is ${q.question}?`,
            answerType: q.answerType,
            difficulty: q.difficulty,
            lessonId: q.lessonId,
        } as any);

        let parallelOptions;
        if (q.answerType === "Grid in") {
            parallelOptions = [
                { questionId: parallelQuestionId, answer: "10/i", isCorrect: true, order: null },
            ];
        } else {
            parallelOptions = [
                { questionId: parallelQuestionId, answer: "5", isCorrect: true, order: "A" },
                { questionId: parallelQuestionId, answer: "10", isCorrect: false, order: "B" },
            ];
        }
        await db.insert(ParallelQuestionOptions).values(parallelOptions);
    }

    console.log(`  ✅ Successfully seeded ${questionsToInsert.length} questions and parallel questions.`);
}
