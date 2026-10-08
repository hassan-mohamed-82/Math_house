import { Request } from "express";
import { randomUUID } from "crypto";
import { db } from "../models/connection";
import { sessionStudentPdfs } from "../models/schema/admin/Session";
import {
    Exams,
    examAttempts,
    studentAnswers,
    questions,
    questionOptions,
    questionAnswers,
} from "../models/schema";
import { eq, and, inArray, sql, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { validateAndSavePdf, deleteImage } from "./handleImages";
import { createMistakesPdf, MistakePdfQuestion } from "./mistakesPdf";

export type MistakesTarget = {
    id: string;
    name: string;
    sessionDate: string | Date | null;
    timeFrom: string;
    lessonIds: string[];
};

export type GenerateMistakesResult = {
    generated: Array<{ studentId: string; mistakesCount: number }>;
    skipped: Array<{ studentId: string; reason: string }>;
};

export const generateMistakesPdfs = async (
    req: Request,
    target: MistakesTarget,
    studentIds: string[]
): Promise<GenerateMistakesResult> => {
    const uniqueStudentIds = Array.from(new Set(studentIds));
    const generated: Array<{ studentId: string; mistakesCount: number }> = [];
    const skipped: Array<{ studentId: string; reason: string }> = [];

    if (uniqueStudentIds.length === 0) {
        return { generated, skipped };
    }

    if (!target.lessonIds || target.lessonIds.length === 0) {
        uniqueStudentIds.forEach(studentId => {
            skipped.push({ studentId, reason: "No lessons linked to session" });
        });
        return { generated, skipped };
    }

    const sessionDateStr = target.sessionDate
        ? (target.sessionDate instanceof Date
            ? target.sessionDate.toISOString().split("T")[0]
            : String(target.sessionDate).split("T")[0])
        : null;

    // 1. Fetch completed/timed_out exam answers for the selected lessons.
    const selectedOption = alias(questionOptions, "selected_option");

    const answers = await db
        .select({
            studentId: examAttempts.studentId,
            attemptId: examAttempts.id,
            startedAt: examAttempts.startedAt,
            endedAt: examAttempts.endedAt,
            examTitle: Exams.title,
            lessonId: questions.lessonId,
            questionId: questions.id,
            question: questions.question,
            questionImage: questions.image,
            selectedAnswer: selectedOption.answer,
            gridInAnswer: studentAnswers.gridInAnswer,
            isCorrect: studentAnswers.isCorrect,
            createdAt: studentAnswers.createdAt,
        })
        .from(studentAnswers)
        .innerJoin(examAttempts, eq(studentAnswers.attemptId, examAttempts.id))
        .innerJoin(Exams, eq(examAttempts.examId, Exams.id))
        .innerJoin(questions, eq(studentAnswers.questionId, questions.id))
        .leftJoin(selectedOption, eq(studentAnswers.selectedOptionId, selectedOption.id))
        .where(and(
            inArray(examAttempts.studentId, uniqueStudentIds),
            inArray(examAttempts.status, ["completed", "timed_out"]),
            inArray(questions.lessonId, target.lessonIds),
            sessionDateStr
                ? sql`COALESCE(${examAttempts.endedAt}, ${examAttempts.startedAt}) <= CONCAT(${sessionDateStr}, ' ', ${target.timeFrom})`
                : undefined
        ))
        .orderBy(asc(examAttempts.startedAt), asc(studentAnswers.createdAt));

    // 2. For each (student, question), only the latest exam answer counts.
    const latestAnswersByStudent = new Map<string, Map<string, typeof answers[0]>>();
    uniqueStudentIds.forEach(studentId => {
        latestAnswersByStudent.set(studentId, new Map());
    });

    answers.forEach(ans => {
        latestAnswersByStudent.get(ans.studentId)!.set(ans.questionId, ans);
    });

    // 3. Identify wrong exam answers per student.
    const studentWrongAnswers = new Map<string, Array<typeof answers[0]>>();
    const allWrongQuestionIds = new Set<string>();

    uniqueStudentIds.forEach(studentId => {
        const studentMap = latestAnswersByStudent.get(studentId)!;
        const wrongList: Array<typeof answers[0]> = [];
        studentMap.forEach(ans => {
            if (!ans.isCorrect) {
                wrongList.push(ans);
                allWrongQuestionIds.add(ans.questionId);
            }
        });

        if (wrongList.length === 0) {
            skipped.push({ studentId, reason: "No exam mistakes found for the selected lessons" });
        } else {
            studentWrongAnswers.set(studentId, wrongList);
        }
    });

    const candidateStudentIds = Array.from(studentWrongAnswers.keys());
    if (candidateStudentIds.length === 0) {
        return { generated, skipped };
    }

    // 4. Fetch correct options and explanations for all wrong questions.
    const wrongQuestionIdsArray = Array.from(allWrongQuestionIds);
    const [options, explanations] = await Promise.all([
        db.select({
            questionId: questionOptions.questionId,
            answer: questionOptions.answer,
            isCorrect: questionOptions.isCorrect,
        }).from(questionOptions).where(inArray(questionOptions.questionId, wrongQuestionIdsArray)),
        db.select({
            questionId: questionAnswers.questionId,
            text: questionAnswers.text,
            pdf: questionAnswers.pdf,
            video: questionAnswers.video,
        }).from(questionAnswers).where(inArray(questionAnswers.questionId, wrongQuestionIdsArray)),
    ]);

    // 5. Generate PDFs and upsert.
    const uploadedUrls: string[] = [];
    const replacedUrls: Array<string | null> = [];

    type UpsertItem = {
        studentId: string;
        session_pdf: string;
        session_answers_pdf: string;
        mistakesCount: number;
    };
    const toUpsert: UpsertItem[] = [];

    try {
        for (const studentId of candidateStudentIds) {
            const wrongList = studentWrongAnswers.get(studentId)!;
            const mistakes: MistakePdfQuestion[] = wrongList.map(ans => {
                const correctList = options
                    .filter(o => o.questionId === ans.questionId && o.isCorrect)
                    .map(o => o.answer)
                    .filter((val): val is string => !!val);

                const questionAnswersForQuestion = explanations.filter(e => e.questionId === ans.questionId);
                const firstAnswerText = questionAnswersForQuestion.find(e => !!e.text)?.text || "";
                const correctAnswer = correctList.length > 0 ? correctList.join(" / ") : firstAnswerText;

                const explanationText = questionAnswersForQuestion
                    .map(item => [
                        item.text,
                        item.pdf ? `Answer PDF: ${item.pdf}` : null,
                        item.video ? `Answer video: ${item.video}` : null,
                    ].filter(Boolean).join("\n"))
                    .filter(Boolean)
                    .join("\n\n");

                const questionText = ans.question || (ans.questionImage ? `Image: ${ans.questionImage}` : "");

                return {
                    sourceTitle: ans.examTitle,
                    question: questionText,
                    selectedAnswer: ans.selectedAnswer ?? ans.gridInAnswer ?? "No answer recorded",
                    correctAnswer: correctAnswer || "Correct answer unavailable",
                    explanation: explanationText,
                };
            });

            const worksheetBuffer = await createMistakesPdf(`${target.name} - Mistakes`, mistakes, false);
            const answersBuffer = await createMistakesPdf(`${target.name} - Mistakes Answers`, mistakes, true);

            const sessionPdfUrl = await validateAndSavePdf(
                req,
                `data:application/pdf;base64,${worksheetBuffer.toString("base64")}`,
                "session-pdfs"
            );
            uploadedUrls.push(sessionPdfUrl);

            const answersPdfUrl = await validateAndSavePdf(
                req,
                `data:application/pdf;base64,${answersBuffer.toString("base64")}`,
                "session-pdfs"
            );
            uploadedUrls.push(answersPdfUrl);

            toUpsert.push({
                studentId,
                session_pdf: sessionPdfUrl,
                session_answers_pdf: answersPdfUrl,
                mistakesCount: mistakes.length,
            });
        }

        // Upsert in one transaction
        await db.transaction(async (tx) => {
            for (const item of toUpsert) {
                const [existing] = await tx
                    .select({
                        id: sessionStudentPdfs.id,
                        session_pdf: sessionStudentPdfs.session_pdf,
                        session_answers_pdf: sessionStudentPdfs.session_answers_pdf,
                        teacher_explanation_pdf: sessionStudentPdfs.teacher_explanation_pdf,
                    })
                    .from(sessionStudentPdfs)
                    .where(and(
                        eq(sessionStudentPdfs.sessionId, target.id),
                        eq(sessionStudentPdfs.studentId, item.studentId)
                    ));

                if (existing) {
                    replacedUrls.push(
                        existing.session_pdf,
                        existing.session_answers_pdf,
                        existing.teacher_explanation_pdf
                    );
                    await tx.update(sessionStudentPdfs).set({
                        session_pdf: item.session_pdf,
                        session_answers_pdf: item.session_answers_pdf,
                        teacher_explanation_pdf: null,
                    }).where(eq(sessionStudentPdfs.id, existing.id));
                } else {
                    await tx.insert(sessionStudentPdfs).values({
                        id: randomUUID(),
                        sessionId: target.id,
                        studentId: item.studentId,
                        session_pdf: item.session_pdf,
                        session_answers_pdf: item.session_answers_pdf,
                        teacher_explanation_pdf: null,
                    });
                }
            }
        });
    } catch (error) {
        await Promise.all(uploadedUrls.map(url => deleteImage(url)));
        throw error;
    }

    // After successful commit, delete replaced old files
    await Promise.all(
        replacedUrls
            .filter((url): url is string => !!url && url.includes("/uploads/"))
            .map(url => deleteImage(url))
    );

    toUpsert.forEach(item => {
        generated.push({
            studentId: item.studentId,
            mistakesCount: item.mistakesCount,
        });
    });

    return { generated, skipped };
};
