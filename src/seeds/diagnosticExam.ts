import { db } from "../models/connection";
import { diagnosticExam, rawScore, questions } from "../models/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export async function seedDiagnosticExams(courseMap: Record<string, string>) {
    console.log("  Fetching Raw Scores for reference...");
    const rawScores = await db.select().from(rawScore);
    const rawScoreMap: Record<string, string> = {};
    rawScores.forEach(rs => {
        rawScoreMap[rs.name] = rs.id;
    });

    const diagnosticExamsData = [
        {
            title: "Primary 1 Placement Test",
            description: "Diagnostic exam to assess Primary 1 readiness.",
            duration: 60,
            rawScoreName: "Primary 1 Score",
            numberOfQuestions: 20,
            passScore: 70,
            isActive: true,
            courseName: "Primary 1",
        },
        {
            title: "Middle 1 Assessment",
            description: "Evaluation of core middle equations concepts.",
            duration: 90,
            rawScoreName: "Middle 1 Score",
            numberOfQuestions: 25,
            passScore: 65,
            isActive: true,
            courseName: "Middle 1",
        },
        {
            title: "Secondary 1 Readiness",
            description: "Check for understanding of Secondary 1 concepts.",
            duration: 45,
            rawScoreName: "Secondary 1 Score",
            numberOfQuestions: 15,
            passScore: 60,
            isActive: true,
            courseName: "Secondary 1",
        }
    ];

    console.log("  Fetching Questions for linking...");
    const allQuestions = await db.select().from(questions);

    if (allQuestions.length === 0) {
        console.log("  ⚠️ No questions found. Skipping linking.");
    }

    let questionIndex = 0;

    for (const data of diagnosticExamsData) {
        if (!rawScoreMap[data.rawScoreName]) {
            console.log(`  ⚠️ Raw Score "${data.rawScoreName}" not found, skipping exam "${data.title}".`);
            continue;
        }

        if (!courseMap[data.courseName]) {
            console.log(`  ⚠️ Course "${data.courseName}" not found, skipping exam "${data.title}".`);
            continue;
        }

        const existing = await db.select().from(diagnosticExam).where(eq(diagnosticExam.title, data.title));
        if (existing.length > 0) {
            console.log(`  Diagnostic Exam "${data.title}" already exists`);
            // Optionally fetch existing ID and link questions if not linked? 
            // For now, assuming fresh seed or clean state.
            continue;
        }

        const rawScoreId = rawScoreMap[data.rawScoreName];
        const selectedRawScore = rawScores.find(r => r.id === rawScoreId);
        const totalScore = selectedRawScore ? selectedRawScore.score : 100;

        // Calculate scores
        const calculatedTotalScore = totalScore - (selectedRawScore?.is_giftingScore ? selectedRawScore.giftingScore : 0);
        const gradePerQuestion = data.numberOfQuestions > 0 ? calculatedTotalScore / data.numberOfQuestions : 0;

        const examId = uuidv4();
        const courseId = courseMap[data.courseName];

        await db.insert(diagnosticExam).values({
            id: examId,
            title: data.title,
            description: data.description,
            duration: data.duration,
            totalScore: totalScore,
            passScore: data.passScore,
            rawScoreId: rawScoreId,
            numberOfQuestions: data.numberOfQuestions,
            isActive: data.isActive,
            courseId: courseId,
        });

        console.log(`  ✅ Diagnostic Exam "${data.title}" created`);

        // Link Questions
        if (allQuestions.length > 0) {
            const questionsToLink = [];
            // Cycle through questions if we run out
            for (let i = 0; i < data.numberOfQuestions; i++) {
                questionsToLink.push(allQuestions[questionIndex % allQuestions.length]);
                questionIndex++;
            }

            const examQuestionsData = questionsToLink.map(q => ({
                id: uuidv4(),
                diagnosticExamId: examId,
                questionId: q.id,
                score: Math.round(gradePerQuestion)
            }));

            // Insert in chunks to be safe? Drizzle handles batch reasonably well.
            // But let's import the table first.
            const { diagnosticExamQuestions } = await import("../models/schema");

            await db.insert(diagnosticExamQuestions).values(examQuestionsData);
            console.log(`    🔗 Linked ${questionsToLink.length} questions (Score per question: ${Math.round(gradePerQuestion)})`);
        }
    }
}
