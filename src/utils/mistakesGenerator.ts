import { Request } from "express";
import { db } from "../models/connection";
import { sessions, sessionStudentPdfs } from "../models/schema/admin/Session";
import {
    Exams,
    Student,
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
    lessonIds: string[];
};

export type GenerateMistakesResult = {
    generated: Array<{ studentId: string; mistakesCount: number }>;
    skipped: Array<{ studentId: string; reason: string }>;
    mistakesCount: number;
    session_pdf: string | null;
    session_answers_pdf: string | null;
};

export const generateMistakesPdfs = async (
    req: Request,
    target: MistakesTarget,
    studentIds: string[]
): Promise<GenerateMistakesResult> => {
    const uniqueStudentIds = Array.from(new Set(studentIds));
    const generated: Array<{ studentId: string; mistakesCount: number }> = [];
    const skipped: Array<{ studentId: string; reason: string }> = [];
    const emptyResult = (): GenerateMistakesResult => ({
        generated,
        skipped,
        mistakesCount: 0,
        session_pdf: null,
        session_answers_pdf: null,
    });

    if (uniqueStudentIds.length === 0) {
        return emptyResult();
    }

    if (!target.lessonIds || target.lessonIds.length === 0) {
        uniqueStudentIds.forEach(studentId => {
            skipped.push({ studentId, reason: "No lessons linked to session" });
        });
        return emptyResult();
    }

    // 1. Fetch completed/timed_out exam answers for the selected lessons.
    const selectedOption = alias(questionOptions, "selected_option");

    const answers = await db
        .select({
            studentId: examAttempts.studentId,
            studentName: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`,
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
        .innerJoin(Student, eq(examAttempts.studentId, Student.id))
        .innerJoin(Exams, eq(examAttempts.examId, Exams.id))
        .innerJoin(questions, eq(studentAnswers.questionId, questions.id))
        .leftJoin(selectedOption, eq(studentAnswers.selectedOptionId, selectedOption.id))
        .where(and(
            inArray(examAttempts.studentId, uniqueStudentIds),
            inArray(examAttempts.status, ["completed", "timed_out"]),
            inArray(questions.lessonId, target.lessonIds)
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
        return emptyResult();
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

    // 5. Generate one combined PDF pair for the session.
    const uploadedUrls: string[] = [];
    const mistakes: MistakePdfQuestion[] = [];
    let totalMistakes = 0;
    const [existingSession] = await db
        .select({
            session_pdf: sessions.session_pdf,
            session_answers_pdf: sessions.session_answers_pdf,
        })
        .from(sessions)
        .where(eq(sessions.id, target.id))
        .limit(1);
    const existingStudentPdfs = await db
        .select({
            session_pdf: sessionStudentPdfs.session_pdf,
            session_answers_pdf: sessionStudentPdfs.session_answers_pdf,
        })
        .from(sessionStudentPdfs)
        .where(eq(sessionStudentPdfs.sessionId, target.id));
    let sessionPdfUrl: string;
    let answersPdfUrl: string;

    try {
        for (const studentId of candidateStudentIds) {
            const wrongList = studentWrongAnswers.get(studentId)!;
            const studentMistakes: MistakePdfQuestion[] = wrongList.map(ans => {
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
                    studentName: ans.studentName,
                    sourceTitle: ans.examTitle,
                    question: questionText,
                    selectedAnswer: ans.selectedAnswer ?? ans.gridInAnswer ?? "No answer recorded",
                    correctAnswer: correctAnswer || "Correct answer unavailable",
                    explanation: explanationText,
                };
            });

            mistakes.push(...studentMistakes);
            totalMistakes += studentMistakes.length;
            generated.push({ studentId, mistakesCount: studentMistakes.length });
        }

        const worksheetBuffer = await createMistakesPdf(`${target.name} - Mistakes`, mistakes, false);
        const answersBuffer = await createMistakesPdf(`${target.name} - Mistakes Answers`, mistakes, true);

        sessionPdfUrl = await validateAndSavePdf(
            req,
            `data:application/pdf;base64,${worksheetBuffer.toString("base64")}`,
            "session-pdfs"
        );
        uploadedUrls.push(sessionPdfUrl);

        answersPdfUrl = await validateAndSavePdf(
            req,
            `data:application/pdf;base64,${answersBuffer.toString("base64")}`,
            "session-pdfs"
        );
        uploadedUrls.push(answersPdfUrl);

        await db.transaction(async tx => {
            await tx.update(sessions).set({
                session_pdf: sessionPdfUrl,
                session_answers_pdf: answersPdfUrl,
            }).where(eq(sessions.id, target.id));

            if (existingStudentPdfs.length > 0) {
                await tx.update(sessionStudentPdfs).set({
                    session_pdf: null,
                    session_answers_pdf: null,
                }).where(eq(sessionStudentPdfs.sessionId, target.id));
            }
        });
    } catch (error) {
        await Promise.all(uploadedUrls.map(url => deleteImage(url)));
        throw error;
    }

    await Promise.all(
        [
            existingSession?.session_pdf,
            existingSession?.session_answers_pdf,
            ...existingStudentPdfs.flatMap(pdf => [pdf.session_pdf, pdf.session_answers_pdf]),
        ]
            .filter((url, index, urls): url is string => !!url && urls.indexOf(url) === index)
            .filter((url): url is string => !!url && url.includes("/uploads/"))
            .map(url => deleteImage(url))
    );

    return {
        generated,
        skipped,
        mistakesCount: totalMistakes,
        session_pdf: sessionPdfUrl,
        session_answers_pdf: answersPdfUrl,
    };
};
