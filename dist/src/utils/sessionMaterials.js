"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSessionMaterials = exports.emptySessionMaterials = void 0;
const connection_1 = require("../models/connection");
const Session_1 = require("../models/schema/admin/Session");
const lessons_1 = require("../models/schema/admin/lessons");
const exams_1 = require("../models/schema/admin/exams");
const drizzle_orm_1 = require("drizzle-orm");
const emptySessionMaterials = () => ({
    session_pdf: null,
    session_answers_pdf: null,
    materials: [],
});
exports.emptySessionMaterials = emptySessionMaterials;
const resolveSessionMaterials = async (sessionIds) => {
    const resultMap = new Map();
    if (sessionIds.length === 0)
        return resultMap;
    const uniqueSessionIds = Array.from(new Set(sessionIds));
    // 1. Fetch sessions
    const sessionRows = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        examId: Session_1.sessions.examId,
        session_pdf: Session_1.sessions.session_pdf,
        session_answers_pdf: Session_1.sessions.session_answers_pdf,
    })
        .from(Session_1.sessions)
        .where((0, drizzle_orm_1.inArray)(Session_1.sessions.id, uniqueSessionIds));
    // 2. Fetch linked exams
    const examIds = sessionRows
        .map(s => s.examId)
        .filter((id) => !!id);
    const examMap = new Map();
    if (examIds.length > 0) {
        const examRows = await connection_1.db
            .select({
            id: exams_1.Exams.id,
            title: exams_1.Exams.title,
            session_pdf: exams_1.Exams.session_pdf,
            session_answers_pdf: exams_1.Exams.session_answers_pdf,
        })
            .from(exams_1.Exams)
            .where((0, drizzle_orm_1.inArray)(exams_1.Exams.id, Array.from(new Set(examIds))));
        examRows.forEach(e => examMap.set(e.id, e));
    }
    // 3. Fetch linked lessons ordered by lessons.order
    const lessonRows = await connection_1.db
        .select({
        sessionId: Session_1.sessionLessons.sessionId,
        lessonId: lessons_1.lessons.id,
        name: lessons_1.lessons.name,
        order: lessons_1.lessons.order,
        session_pdf: lessons_1.lessons.session_pdf,
        session_answers_pdf: lessons_1.lessons.session_answers_pdf,
    })
        .from(Session_1.sessionLessons)
        .innerJoin(lessons_1.lessons, (0, drizzle_orm_1.eq)(Session_1.sessionLessons.lessonId, lessons_1.lessons.id))
        .where((0, drizzle_orm_1.inArray)(Session_1.sessionLessons.sessionId, uniqueSessionIds))
        .orderBy((0, drizzle_orm_1.asc)(lessons_1.lessons.order));
    const lessonsBySession = new Map();
    lessonRows.forEach(l => {
        if (!lessonsBySession.has(l.sessionId)) {
            lessonsBySession.set(l.sessionId, []);
        }
        lessonsBySession.get(l.sessionId).push(l);
    });
    // 4. Resolve materials and effective PDFs for each session
    sessionRows.forEach(session => {
        const isMistakes = session.sessionRelationalType === "Mistakes";
        const materials = [];
        // Session-level override
        if (session.session_pdf || session.session_answers_pdf) {
            materials.push({
                source: "session",
                sourceId: session.id,
                name: session.name,
                session_pdf: session.session_pdf ?? null,
                session_answers_pdf: session.session_answers_pdf ?? null,
            });
        }
        if (isMistakes) {
            // Sessions of type "Mistakes" must never inherit from exam/lessons
            resultMap.set(session.id, {
                session_pdf: session.session_pdf ?? null,
                session_answers_pdf: session.session_answers_pdf ?? null,
                materials,
            });
            return;
        }
        // Exam materials
        const linkedExam = session.examId ? examMap.get(session.examId) : undefined;
        if (linkedExam && (linkedExam.session_pdf || linkedExam.session_answers_pdf)) {
            materials.push({
                source: "exam",
                sourceId: linkedExam.id,
                name: linkedExam.title,
                session_pdf: linkedExam.session_pdf ?? null,
                session_answers_pdf: linkedExam.session_answers_pdf ?? null,
            });
        }
        // Lesson materials
        const sessionLessonList = lessonsBySession.get(session.id) || [];
        sessionLessonList.forEach(lesson => {
            if (lesson.session_pdf || lesson.session_answers_pdf) {
                materials.push({
                    source: "lesson",
                    sourceId: lesson.lessonId,
                    name: lesson.name,
                    session_pdf: lesson.session_pdf ?? null,
                    session_answers_pdf: lesson.session_answers_pdf ?? null,
                });
            }
        });
        // Resolve effective session_pdf
        let effectivePdf = null;
        if (session.session_pdf) {
            effectivePdf = session.session_pdf;
        }
        else if (linkedExam?.session_pdf) {
            effectivePdf = linkedExam.session_pdf;
        }
        else {
            const firstLessonWithPdf = sessionLessonList.find(l => !!l.session_pdf);
            effectivePdf = firstLessonWithPdf?.session_pdf ?? null;
        }
        // Resolve effective session_answers_pdf
        let effectiveAnswersPdf = null;
        if (session.session_answers_pdf) {
            effectiveAnswersPdf = session.session_answers_pdf;
        }
        else if (linkedExam?.session_answers_pdf) {
            effectiveAnswersPdf = linkedExam.session_answers_pdf;
        }
        else {
            const firstLessonWithAnswersPdf = sessionLessonList.find(l => !!l.session_answers_pdf);
            effectiveAnswersPdf = firstLessonWithAnswersPdf?.session_answers_pdf ?? null;
        }
        resultMap.set(session.id, {
            session_pdf: effectivePdf,
            session_answers_pdf: effectiveAnswersPdf,
            materials,
        });
    });
    // Ensure all requested sessionIds exist in map
    uniqueSessionIds.forEach(id => {
        if (!resultMap.has(id)) {
            resultMap.set(id, (0, exports.emptySessionMaterials)());
        }
    });
    return resultMap;
};
exports.resolveSessionMaterials = resolveSessionMaterials;
