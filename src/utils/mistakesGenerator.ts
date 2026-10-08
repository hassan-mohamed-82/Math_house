import { Request } from "express";
import { randomUUID } from "crypto";
import { db } from "../models/connection";
import { sessions, sessionLessons, sessionAttendance, sessionStudentPdfs } from "../models/schema/admin/Session";
import {
    quizzes,
    quizAttempts,
    studentQuizAnswers,
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

    // 1. Qualifying attended sessions and lessons per student
    const attendedLessonRows = await db
        .select({
            studentId: sessionAttendance.studentId,
            lessonId: sessionLessons.lessonId,
        })
        .from(sessionAttendance)
        .innerJoin(sessions, eq(sessionAttendance.sessionId, sessions.id))
        .innerJoin(sessionLessons, eq(sessions.id, sessionLessons.sessionId))
        .where(and(
            inArray(sessionAttendance.studentId, uniqueStudentIds),
            eq(sessionAttendance.status, "present"),
            sql`${sessions.id} <> ${target.id}`,
            sql`COALESCE(${sessions.sessionRelationalType}, '') <> 'Mistakes'`,
            sessionDateStr
                ? sql`(${sessions.sessionDate} < ${sessionDateStr} OR (${sessions.sessionDate} = ${sessionDateStr} AND ${sessions.timeTo} <= ${target.timeFrom}))`
                : undefined,
            inArray(sessionLessons.lessonId, target.lessonIds)
        ));

    const studentQualifyingLessons = new Map<string, Set<string>>();
    attendedLessonRows.forEach(row => {
        if (!studentQualifyingLessons.has(row.studentId)) {
            studentQualifyingLessons.set(row.studentId, new Set<string>());
        }
        studentQualifyingLessons.get(row.studentId)!.add(row.lessonId);
    });

    const studentsWithLessons: string[] = [];
    uniqueStudentIds.forEach(studentId => {
        const lessonsSet = studentQualifyingLessons.get(studentId);
        if (!lessonsSet || lessonsSet.size === 0) {
            skipped.push({ studentId, reason: "No qualifying attended sessions for selected lessons" });
        } else {
            studentsWithLessons.push(studentId);
        }
    });

    if (studentsWithLessons.length === 0) {
        return { generated, skipped };
    }

    const allQualifyingLessonIdsSet = new Set<string>();
    studentsWithLessons.forEach(studentId => {
        studentQualifyingLessons.get(studentId)!.forEach(lId => allQualifyingLessonIdsSet.add(lId));
    });
    const allQualifyingLessonIds = Array.from(allQualifyingLessonIdsSet);

    // 2. Fetch completed/timed_out quiz attempts
    const selectedOption = alias(questionOptions, "selected_option");

    const answers = await db
        .select({
            studentId: quizAttempts.studentId,
            attemptId: quizAttempts.id,
            startedAt: quizAttempts.startedAt,
            quizTitle: quizzes.title,
            lessonId: quizzes.lessonId,
            questionId: questions.id,
            question: questions.question,
            questionImage: questions.image,
            selectedAnswer: selectedOption.answer,
            gridInAnswer: studentQuizAnswers.gridInAnswer,
            isCorrect: studentQuizAnswers.isCorrect,
            createdAt: studentQuizAnswers.createdAt,
        })
        .from(studentQuizAnswers)
        .innerJoin(quizAttempts, eq(studentQuizAnswers.attemptId, quizAttempts.id))
        .innerJoin(quizzes, eq(quizAttempts.quizId, quizzes.id))
        .innerJoin(questions, eq(studentQuizAnswers.questionId, questions.id))
        .leftJoin(selectedOption, eq(studentQuizAnswers.selectedOptionId, selectedOption.id))
        .where(and(
            inArray(quizAttempts.studentId, studentsWithLessons),
            inArray(quizAttempts.status, ["completed", "timed_out"]),
            inArray(quizzes.lessonId, allQualifyingLessonIds)
        ))
        .orderBy(asc(quizAttempts.startedAt), asc(studentQuizAnswers.createdAt));

    // 3. For each (student, question), only the latest answer counts
    const latestAnswersByStudent = new Map<string, Map<string, typeof answers[0]>>();
    studentsWithLessons.forEach(studentId => {
        latestAnswersByStudent.set(studentId, new Map());
    });

    answers.forEach(ans => {
        if (!ans.lessonId || !studentQualifyingLessons.get(ans.studentId)?.has(ans.lessonId)) {
            return;
        }
        latestAnswersByStudent.get(ans.studentId)!.set(ans.questionId, ans);
    });

    // 4. Identify wrong answers per student
    const studentWrongAnswers = new Map<string, Array<typeof answers[0]>>();
    const allWrongQuestionIds = new Set<string>();

    studentsWithLessons.forEach(studentId => {
        const studentMap = latestAnswersByStudent.get(studentId)!;
        const wrongList: Array<typeof answers[0]> = [];
        studentMap.forEach(ans => {
            if (!ans.isCorrect) {
                wrongList.push(ans);
                allWrongQuestionIds.add(ans.questionId);
            }
        });

        if (wrongList.length === 0) {
            skipped.push({ studentId, reason: "No quiz mistakes found" });
        } else {
            studentWrongAnswers.set(studentId, wrongList);
        }
    });

    const candidateStudentIds = Array.from(studentWrongAnswers.keys());
    if (candidateStudentIds.length === 0) {
        return { generated, skipped };
    }

    // 5. Fetch correct options and explanations for all wrong questions
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

    // 6. Generate PDFs and upsert
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
                    quizTitle: ans.quizTitle,
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
