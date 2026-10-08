"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMistakesPdfs = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../models/connection");
const Session_1 = require("../models/schema/admin/Session");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql_core_1 = require("drizzle-orm/mysql-core");
const handleImages_1 = require("./handleImages");
const mistakesPdf_1 = require("./mistakesPdf");
const generateMistakesPdfs = async (req, target, studentIds) => {
    const uniqueStudentIds = Array.from(new Set(studentIds));
    const generated = [];
    const skipped = [];
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
    const selectedOption = (0, mysql_core_1.alias)(schema_1.questionOptions, "selected_option");
    const answers = await connection_1.db
        .select({
        studentId: schema_1.examAttempts.studentId,
        attemptId: schema_1.examAttempts.id,
        startedAt: schema_1.examAttempts.startedAt,
        endedAt: schema_1.examAttempts.endedAt,
        examTitle: schema_1.Exams.title,
        lessonId: schema_1.questions.lessonId,
        questionId: schema_1.questions.id,
        question: schema_1.questions.question,
        questionImage: schema_1.questions.image,
        selectedAnswer: selectedOption.answer,
        gridInAnswer: schema_1.studentAnswers.gridInAnswer,
        isCorrect: schema_1.studentAnswers.isCorrect,
        createdAt: schema_1.studentAnswers.createdAt,
    })
        .from(schema_1.studentAnswers)
        .innerJoin(schema_1.examAttempts, (0, drizzle_orm_1.eq)(schema_1.studentAnswers.attemptId, schema_1.examAttempts.id))
        .innerJoin(schema_1.Exams, (0, drizzle_orm_1.eq)(schema_1.examAttempts.examId, schema_1.Exams.id))
        .innerJoin(schema_1.questions, (0, drizzle_orm_1.eq)(schema_1.studentAnswers.questionId, schema_1.questions.id))
        .leftJoin(selectedOption, (0, drizzle_orm_1.eq)(schema_1.studentAnswers.selectedOptionId, selectedOption.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.examAttempts.studentId, uniqueStudentIds), (0, drizzle_orm_1.inArray)(schema_1.examAttempts.status, ["completed", "timed_out"]), (0, drizzle_orm_1.inArray)(schema_1.questions.lessonId, target.lessonIds), sessionDateStr
        ? (0, drizzle_orm_1.sql) `COALESCE(${schema_1.examAttempts.endedAt}, ${schema_1.examAttempts.startedAt}) <= CONCAT(${sessionDateStr}, ' ', ${target.timeFrom})`
        : undefined))
        .orderBy((0, drizzle_orm_1.asc)(schema_1.examAttempts.startedAt), (0, drizzle_orm_1.asc)(schema_1.studentAnswers.createdAt));
    // 2. For each (student, question), only the latest exam answer counts.
    const latestAnswersByStudent = new Map();
    uniqueStudentIds.forEach(studentId => {
        latestAnswersByStudent.set(studentId, new Map());
    });
    answers.forEach(ans => {
        latestAnswersByStudent.get(ans.studentId).set(ans.questionId, ans);
    });
    // 3. Identify wrong exam answers per student.
    const studentWrongAnswers = new Map();
    const allWrongQuestionIds = new Set();
    uniqueStudentIds.forEach(studentId => {
        const studentMap = latestAnswersByStudent.get(studentId);
        const wrongList = [];
        studentMap.forEach(ans => {
            if (!ans.isCorrect) {
                wrongList.push(ans);
                allWrongQuestionIds.add(ans.questionId);
            }
        });
        if (wrongList.length === 0) {
            skipped.push({ studentId, reason: "No exam mistakes found for the selected lessons" });
        }
        else {
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
        connection_1.db.select({
            questionId: schema_1.questionOptions.questionId,
            answer: schema_1.questionOptions.answer,
            isCorrect: schema_1.questionOptions.isCorrect,
        }).from(schema_1.questionOptions).where((0, drizzle_orm_1.inArray)(schema_1.questionOptions.questionId, wrongQuestionIdsArray)),
        connection_1.db.select({
            questionId: schema_1.questionAnswers.questionId,
            text: schema_1.questionAnswers.text,
            pdf: schema_1.questionAnswers.pdf,
            video: schema_1.questionAnswers.video,
        }).from(schema_1.questionAnswers).where((0, drizzle_orm_1.inArray)(schema_1.questionAnswers.questionId, wrongQuestionIdsArray)),
    ]);
    // 5. Generate PDFs and upsert.
    const uploadedUrls = [];
    const replacedUrls = [];
    const toUpsert = [];
    try {
        for (const studentId of candidateStudentIds) {
            const wrongList = studentWrongAnswers.get(studentId);
            const mistakes = wrongList.map(ans => {
                const correctList = options
                    .filter(o => o.questionId === ans.questionId && o.isCorrect)
                    .map(o => o.answer)
                    .filter((val) => !!val);
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
            const worksheetBuffer = await (0, mistakesPdf_1.createMistakesPdf)(`${target.name} - Mistakes`, mistakes, false);
            const answersBuffer = await (0, mistakesPdf_1.createMistakesPdf)(`${target.name} - Mistakes Answers`, mistakes, true);
            const sessionPdfUrl = await (0, handleImages_1.validateAndSavePdf)(req, `data:application/pdf;base64,${worksheetBuffer.toString("base64")}`, "session-pdfs");
            uploadedUrls.push(sessionPdfUrl);
            const answersPdfUrl = await (0, handleImages_1.validateAndSavePdf)(req, `data:application/pdf;base64,${answersBuffer.toString("base64")}`, "session-pdfs");
            uploadedUrls.push(answersPdfUrl);
            toUpsert.push({
                studentId,
                session_pdf: sessionPdfUrl,
                session_answers_pdf: answersPdfUrl,
                mistakesCount: mistakes.length,
            });
        }
        // Upsert in one transaction
        await connection_1.db.transaction(async (tx) => {
            for (const item of toUpsert) {
                const [existing] = await tx
                    .select({
                    id: Session_1.sessionStudentPdfs.id,
                    session_pdf: Session_1.sessionStudentPdfs.session_pdf,
                    session_answers_pdf: Session_1.sessionStudentPdfs.session_answers_pdf,
                    teacher_explanation_pdf: Session_1.sessionStudentPdfs.teacher_explanation_pdf,
                })
                    .from(Session_1.sessionStudentPdfs)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.sessionId, target.id), (0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.studentId, item.studentId)));
                if (existing) {
                    replacedUrls.push(existing.session_pdf, existing.session_answers_pdf, existing.teacher_explanation_pdf);
                    await tx.update(Session_1.sessionStudentPdfs).set({
                        session_pdf: item.session_pdf,
                        session_answers_pdf: item.session_answers_pdf,
                        teacher_explanation_pdf: null,
                    }).where((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.id, existing.id));
                }
                else {
                    await tx.insert(Session_1.sessionStudentPdfs).values({
                        id: (0, crypto_1.randomUUID)(),
                        sessionId: target.id,
                        studentId: item.studentId,
                        session_pdf: item.session_pdf,
                        session_answers_pdf: item.session_answers_pdf,
                        teacher_explanation_pdf: null,
                    });
                }
            }
        });
    }
    catch (error) {
        await Promise.all(uploadedUrls.map(url => (0, handleImages_1.deleteImage)(url)));
        throw error;
    }
    // After successful commit, delete replaced old files
    await Promise.all(replacedUrls
        .filter((url) => !!url && url.includes("/uploads/"))
        .map(url => (0, handleImages_1.deleteImage)(url)));
    toUpsert.forEach(item => {
        generated.push({
            studentId: item.studentId,
            mistakesCount: item.mistakesCount,
        });
    });
    return { generated, skipped };
};
exports.generateMistakesPdfs = generateMistakesPdfs;
