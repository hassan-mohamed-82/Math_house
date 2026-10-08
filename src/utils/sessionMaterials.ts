import { db } from "../models/connection";
import { sessions, sessionLessons } from "../models/schema/admin/Session";
import { lessons } from "../models/schema/admin/lessons";
import { Exams } from "../models/schema/admin/exams";
import { inArray, eq, asc } from "drizzle-orm";

export type SessionMaterialItem = {
    source: "session" | "exam" | "lesson";
    sourceId: string;
    name: string;
    session_pdf: string | null;
    session_answers_pdf: string | null;
};

export type SessionMaterialsResult = {
    session_pdf: string | null;
    session_answers_pdf: string | null;
    materials: SessionMaterialItem[];
};

export const emptySessionMaterials = (): SessionMaterialsResult => ({
    session_pdf: null,
    session_answers_pdf: null,
    materials: [],
});

export const resolveSessionMaterials = async (
    sessionIds: string[]
): Promise<Map<string, SessionMaterialsResult>> => {
    const resultMap = new Map<string, SessionMaterialsResult>();
    if (sessionIds.length === 0) return resultMap;

    const uniqueSessionIds = Array.from(new Set(sessionIds));

    // 1. Fetch sessions
    const sessionRows = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionRelationalType: sessions.sessionRelationalType,
            examId: sessions.examId,
            session_pdf: sessions.session_pdf,
            session_answers_pdf: sessions.session_answers_pdf,
        })
        .from(sessions)
        .where(inArray(sessions.id, uniqueSessionIds));

    // 2. Fetch linked exams
    const examIds = sessionRows
        .map(s => s.examId)
        .filter((id): id is string => !!id);

    const examMap = new Map<string, { id: string; title: string; session_pdf: string | null; session_answers_pdf: string | null }>();
    if (examIds.length > 0) {
        const examRows = await db
            .select({
                id: Exams.id,
                title: Exams.title,
                session_pdf: Exams.session_pdf,
                session_answers_pdf: Exams.session_answers_pdf,
            })
            .from(Exams)
            .where(inArray(Exams.id, Array.from(new Set(examIds))));

        examRows.forEach(e => examMap.set(e.id, e));
    }

    // 3. Fetch linked lessons ordered by lessons.order
    const lessonRows = await db
        .select({
            sessionId: sessionLessons.sessionId,
            lessonId: lessons.id,
            name: lessons.name,
            order: lessons.order,
            session_pdf: lessons.session_pdf,
            session_answers_pdf: lessons.session_answers_pdf,
        })
        .from(sessionLessons)
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .where(inArray(sessionLessons.sessionId, uniqueSessionIds))
        .orderBy(asc(lessons.order));

    const lessonsBySession = new Map<string, Array<{
        lessonId: string;
        name: string;
        order: number;
        session_pdf: string | null;
        session_answers_pdf: string | null;
    }>>();

    lessonRows.forEach(l => {
        if (!lessonsBySession.has(l.sessionId)) {
            lessonsBySession.set(l.sessionId, []);
        }
        lessonsBySession.get(l.sessionId)!.push(l);
    });

    // 4. Resolve materials and effective PDFs for each session
    sessionRows.forEach(session => {
        const isMistakes = session.sessionRelationalType === "Mistakes";

        const materials: SessionMaterialItem[] = [];

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
        let effectivePdf: string | null = null;
        if (session.session_pdf) {
            effectivePdf = session.session_pdf;
        } else if (linkedExam?.session_pdf) {
            effectivePdf = linkedExam.session_pdf;
        } else {
            const firstLessonWithPdf = sessionLessonList.find(l => !!l.session_pdf);
            effectivePdf = firstLessonWithPdf?.session_pdf ?? null;
        }

        // Resolve effective session_answers_pdf
        let effectiveAnswersPdf: string | null = null;
        if (session.session_answers_pdf) {
            effectiveAnswersPdf = session.session_answers_pdf;
        } else if (linkedExam?.session_answers_pdf) {
            effectiveAnswersPdf = linkedExam.session_answers_pdf;
        } else {
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
            resultMap.set(id, emptySessionMaterials());
        }
    });

    return resultMap;
};
