import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { sessionLessons, sessions, sessionUsers, sessionGroups, sessionStudentPdfs } from "../../models/schema/admin/Session";
import { lessons, lessonIdeas, sessionAttendance, chapters } from "../../models/schema";
import { groupStudents } from "../../models/schema/admin/Groups";
import { teachers } from "../../models/schema/admin/teacher";
import { courses } from "../../models/schema/admin/courses";
import { Student } from "../../models/schema/admin/Student";
import { enrolledItems } from "../../models/schema/user/enrolledItems";
import { eq, and, or, inArray, sql, gt, asc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { generateSecureStreamUrl } from "../../drive/services/services";

// ── config ────────────────────────────────────────────────────────────────────

/** Students may join this many minutes before the session starts (until timeTo). */
const JOIN_OPEN_BEFORE_MIN = 15;

// ── helpers ───────────────────────────────────────────────────────────────────

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

/** Current date/time in Cairo (session dates/times are stored as Cairo local time). */
const cairoNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    const hour = p.hour === "24" ? "00" : p.hour;
    return {
        today: `${p.year}-${p.month}-${p.day}`,
        currentTime: `${hour}:${p.minute}:${p.second}`,
    };
};

const toMinutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

const resolveIdea = (idea: {
    id: string;
    idea: string;
    ideaOrder: number;
    pdf: string | null;
    video: string | null;
    bunnyGuid: string | null;
}) => {
    const { bunnyGuid, video, ...rest } = idea;
    let videoPayload: { type: "bunny"; streamUrl: string } | { type: "external"; url: string } | null = null;
    if (bunnyGuid) {
        videoPayload = { type: "bunny", streamUrl: generateSecureStreamUrl(bunnyGuid) };
    } else if (video) {
        videoPayload = { type: "external", url: video };
    }
    return { ...rest, video: videoPayload };
};

/** Student is enrolled directly (session_users) or through a group. */
async function isEnrolled(studentId: string, sessionId: string): Promise<boolean> {
    const [direct] = await db
        .select({ id: sessionUsers.id })
        .from(sessionUsers)
        .where(and(eq(sessionUsers.sessionId, sessionId), eq(sessionUsers.studentId, studentId)));
    if (direct) return true;

    const [viaGroup] = await db
        .select({ id: sessionGroups.id })
        .from(sessionGroups)
        .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
        .where(and(eq(sessionGroups.sessionId, sessionId), eq(groupStudents.studentId, studentId)));
    return !!viaGroup;
}

/** Sub-query: every session the student is enrolled in (direct OR via group). */
const enrolledSessionsFilter = (studentId: string) =>
    or(
        inArray(
            sessions.id,
            db.select({ sessionId: sessionUsers.sessionId }).from(sessionUsers).where(eq(sessionUsers.studentId, studentId))
        ),
        inArray(
            sessions.id,
            db
                .select({ sessionId: sessionGroups.sessionId })
                .from(sessionGroups)
                .where(
                    inArray(
                        sessionGroups.groupId,
                        db.select({ groupId: groupStudents.groupId }).from(groupStudents).where(eq(groupStudents.studentId, studentId))
                    )
                )
        )
    );

/**
 * PDFs the student sees. For "Mistakes" sessions the personal PDF wins,
 * otherwise (or if the personal field is empty) fall back to the session-level one.
 * session_answers_pdf is never exposed to students.
 */
const resolvePdfs = (
    s: { sessionRelationalType: string | null; session_pdf: string | null; teacher_explanation_pdf: string | null },
    studentPdf?: { session_pdf: string | null; teacher_explanation_pdf: string | null }
) => {
    if (s.sessionRelationalType === "Mistakes" && studentPdf) {
        return {
            session_pdf: studentPdf.session_pdf ?? s.session_pdf ?? null,
            teacher_explanation_pdf: studentPdf.teacher_explanation_pdf ?? s.teacher_explanation_pdf ?? null,
        };
    }
    return {
        session_pdf: s.session_pdf ?? null,
        teacher_explanation_pdf: s.teacher_explanation_pdf ?? null,
    };
};

async function fetchIdeasByLesson(lessonIds: string[]) {
    const ideasByLesson = new Map<string, any[]>();
    if (lessonIds.length === 0) return ideasByLesson;

    const ideas = await db
        .select({
            id: lessonIdeas.id,
            lessonId: lessonIdeas.lessonId,
            idea: lessonIdeas.idea,
            ideaOrder: lessonIdeas.ideaOrder,
            pdf: lessonIdeas.pdf,
            video: lessonIdeas.video,
            bunnyGuid: lessonIdeas.bunnyGuid,
        })
        .from(lessonIdeas)
        .where(inArray(lessonIdeas.lessonId, lessonIds))
        .orderBy(asc(lessonIdeas.ideaOrder));

    ideas.forEach(idea => {
        if (!ideasByLesson.has(idea.lessonId)) ideasByLesson.set(idea.lessonId, []);
        ideasByLesson.get(idea.lessonId)!.push(resolveIdea(idea));
    });
    return ideasByLesson;
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const getUpcomingSessions = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { today, currentTime } = cairoNow();

    const ExistingStudent = await db.select({ id: Student.id }).from(Student).where(eq(Student.id, studentId));
    if (ExistingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const rawSessions = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            sessionRelationalType: sessions.sessionRelationalType,
            session_pdf: sessions.session_pdf,
            lesson: {
                id: lessons.id,
                name: lessons.name,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
        })
        .from(sessions)
        .leftJoin(sessionLessons, eq(sessions.id, sessionLessons.sessionId))
        .leftJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        .where(and(
            sql`(
                ${sessions.sessionDate} > ${today}
                OR (${sessions.sessionDate} = ${today} AND ${sessions.timeTo} >= ${currentTime})
            )`,
            enrolledSessionsFilter(studentId)
        ))
        .orderBy(sql`${sessions.sessionDate} ASC, ${sessions.timeFrom} ASC`);

    const sessionsMap = new Map<string, any>();
    rawSessions.forEach((row) => {
        if (!sessionsMap.has(row.id)) {
            sessionsMap.set(row.id, {
                id: row.id,
                name: row.name,
                sessionDate: row.sessionDate,
                timeFrom: row.timeFrom,
                timeTo: row.timeTo,
                sessionLink: row.sessionLink,
                sessionRelationalType: row.sessionRelationalType,
                session_pdf: row.session_pdf,
                lessons: [],
            });
        }
        if (row.lesson && row.lesson.id) {
            const session = sessionsMap.get(row.id);
            if (!session.lessons.some((l: any) => l.id === row.lesson!.id)) {
                session.lessons.push({
                    ...row.lesson,
                    chapter: row.chapter,
                    course: row.course,
                });
            }
        }
    });

    // Personalised blank PDFs for Mistakes sessions
    const sessionIds = Array.from(sessionsMap.keys());
    const studentPdfMap = new Map<string, string | null>();
    if (sessionIds.length > 0) {
        const studentPdfs = await db
            .select({
                sessionId: sessionStudentPdfs.sessionId,
                session_pdf: sessionStudentPdfs.session_pdf,
            })
            .from(sessionStudentPdfs)
            .where(and(
                eq(sessionStudentPdfs.studentId, studentId),
                inArray(sessionStudentPdfs.sessionId, sessionIds)
            ));

        studentPdfs.forEach(sp => studentPdfMap.set(sp.sessionId, sp.session_pdf));
    }

    const formattedSessions = Array.from(sessionsMap.values()).map((s: any) => ({
        ...s,
        session_pdf: s.sessionRelationalType === "Mistakes"
            ? (studentPdfMap.get(s.id) ?? s.session_pdf ?? null)
            : (s.session_pdf ?? null),
    }));

    return SuccessResponse(res, formattedSessions);
};

export const getSessionHistory = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { today, currentTime } = cairoNow();

    const ExistingStudent = await db.select({ id: Student.id }).from(Student).where(eq(Student.id, studentId));
    if (ExistingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const rawPastSessions = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            materialLink: sessions.material_link,
            sessionRelationalType: sessions.sessionRelationalType,
            session_pdf: sessions.session_pdf,
            teacher_explanation_pdf: sessions.teacher_explanation_pdf,
            attendanceStatus: sessionAttendance.status,
            attendedAt: sessionAttendance.attendedAt,
            lesson: {
                id: lessons.id,
                name: lessons.name,
                description: lessons.description,
                image: lessons.image,
                order: lessons.order,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
        })
        .from(sessions)
        .leftJoin(sessionAttendance, and(
            eq(sessionAttendance.sessionId, sessions.id),
            eq(sessionAttendance.studentId, studentId)
        ))
        .leftJoin(sessionLessons, eq(sessions.id, sessionLessons.sessionId))
        .leftJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        .where(and(
            sql`(
                ${sessions.sessionDate} < ${today}
                OR (${sessions.sessionDate} = ${today} AND ${sessions.timeTo} < ${currentTime})
            )`,
            enrolledSessionsFilter(studentId)
        ))
        .orderBy(sql`${sessions.sessionDate} DESC, ${sessions.timeFrom} DESC`);

    const pastSessionsMap = new Map<string, any>();
    rawPastSessions.forEach((row) => {
        if (!pastSessionsMap.has(row.id)) {
            pastSessionsMap.set(row.id, {
                id: row.id,
                name: row.name,
                sessionDate: row.sessionDate,
                timeFrom: row.timeFrom,
                timeTo: row.timeTo,
                sessionLink: row.sessionLink,
                materialLink: row.materialLink,
                sessionRelationalType: row.sessionRelationalType,
                session_pdf: row.session_pdf,
                teacher_explanation_pdf: row.teacher_explanation_pdf,
                attendanceStatus: row.attendanceStatus || "not_marked",
                attendedAt: row.attendedAt,
                lessons: [],
            });
        }
        if (row.lesson && row.lesson.id) {
            const session = pastSessionsMap.get(row.id);
            if (!session.lessons.some((l: any) => l.id === row.lesson!.id)) {
                session.lessons.push({
                    ...row.lesson,
                    chapter: row.chapter,
                    course: row.course,
                });
            }
        }
    });

    const pastSessionIds = Array.from(pastSessionsMap.keys());

    // 1. Per-student PDFs (Mistakes sessions)
    const studentPdfMap = new Map<string, { session_pdf: string | null; teacher_explanation_pdf: string | null }>();
    if (pastSessionIds.length > 0) {
        const studentPdfs = await db
            .select({
                sessionId: sessionStudentPdfs.sessionId,
                session_pdf: sessionStudentPdfs.session_pdf,
                teacher_explanation_pdf: sessionStudentPdfs.teacher_explanation_pdf,
            })
            .from(sessionStudentPdfs)
            .where(and(
                eq(sessionStudentPdfs.studentId, studentId),
                inArray(sessionStudentPdfs.sessionId, pastSessionIds)
            ));

        studentPdfs.forEach(sp =>
            studentPdfMap.set(sp.sessionId, {
                session_pdf: sp.session_pdf,
                teacher_explanation_pdf: sp.teacher_explanation_pdf,
            })
        );
    }

    // 2. Ideas for lessons of attended sessions (permanent access once attended)
    const attendedLessonIds = new Set<string>();
    pastSessionsMap.forEach((s: any) => {
        if (s.attendanceStatus === "present") {
            s.lessons.forEach((l: any) => l.id && attendedLessonIds.add(l.id));
        }
    });
    const ideasByLesson = await fetchIdeasByLesson(Array.from(attendedLessonIds));

    // 3. Final response
    const formattedSessions = Array.from(pastSessionsMap.values()).map((s: any) => {
        const isAttended = s.attendanceStatus === "present";
        const pdfs = resolvePdfs(s, studentPdfMap.get(s.id));

        return {
            ...s,
            ...pdfs,
            lessons: s.lessons.map((l: any) => ({
                ...l,
                ideas: isAttended ? (ideasByLesson.get(l.id) || []) : [],
                ideasLocked: !isAttended,
            })),
        };
    });

    return SuccessResponse(res, formattedSessions);
};

export const getSessionDetails = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { sessionId } = req.params;

    const [session] = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            materialLink: sessions.material_link,
            sessionRelationalType: sessions.sessionRelationalType,
            session_pdf: sessions.session_pdf,
            teacher_explanation_pdf: sessions.teacher_explanation_pdf,
            teacherId: sessions.teacherId,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) throw new NotFound("Session not found");

    if (!(await isEnrolled(studentId, sessionId))) {
        throw new NotFound("You are not enrolled in this session");
    }

    const [teacher] = await db
        .select({
            id: teachers.id,
            name: teachers.name,
            avatar: teachers.avatar,
        })
        .from(teachers)
        .where(eq(teachers.id, session.teacherId));

    const [attendance] = await db
        .select({
            status: sessionAttendance.status,
            attendedAt: sessionAttendance.attendedAt,
        })
        .from(sessionAttendance)
        .where(and(
            eq(sessionAttendance.sessionId, sessionId),
            eq(sessionAttendance.studentId, studentId)
        ));

    const isAttended = attendance?.status === "present";

    // PDFs (personal for Mistakes, else session-level)
    let studentPdf: { session_pdf: string | null; teacher_explanation_pdf: string | null } | undefined;
    if (session.sessionRelationalType === "Mistakes") {
        [studentPdf] = await db
            .select({
                session_pdf: sessionStudentPdfs.session_pdf,
                teacher_explanation_pdf: sessionStudentPdfs.teacher_explanation_pdf,
            })
            .from(sessionStudentPdfs)
            .where(and(
                eq(sessionStudentPdfs.sessionId, sessionId),
                eq(sessionStudentPdfs.studentId, studentId)
            ));
    }
    const pdfs = resolvePdfs(session, studentPdf);

    // Lessons
    const sessionLessonRows = await db
        .select({
            lesson: {
                id: lessons.id,
                name: lessons.name,
                description: lessons.description,
                image: lessons.image,
                order: lessons.order,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
        })
        .from(sessionLessons)
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .where(eq(sessionLessons.sessionId, sessionId));

    const ideasByLesson = isAttended
        ? await fetchIdeasByLesson(sessionLessonRows.map(r => r.lesson.id))
        : new Map<string, any[]>();

    const formattedLessons = sessionLessonRows.map(row => ({
        ...row.lesson,
        chapter: row.chapter,
        course: row.course,
        ideas: isAttended ? (ideasByLesson.get(row.lesson.id) || []) : [],
        ideasLocked: !isAttended,
    }));

    return SuccessResponse(res, {
        session: {
            id: session.id,
            name: session.name,
            scheduleType: session.scheduleType,
            sessionDate: session.sessionDate,
            startDate: session.startDate,
            endDate: session.endDate,
            timeFrom: session.timeFrom,
            timeTo: session.timeTo,
            sessionLink: session.sessionLink,
            materialLink: session.materialLink,
            sessionRelationalType: session.sessionRelationalType,
            ...pdfs,
            teacher: teacher ?? null,
            attendance: attendance
                ? { status: attendance.status, attendedAt: attendance.attendedAt }
                : { status: "not_marked", attendedAt: null },
            lessons: formattedLessons,
        },
    }, 200);
};

export const joinSession = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { sessionId } = req.params;

    const [session] = await db
        .select({
            id: sessions.id,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            sessionRelationalType: sessions.sessionRelationalType,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) throw new NotFound("Session not found");

    if (!(await isEnrolled(studentId, sessionId))) {
        throw new NotFound("You are not enrolled in this session");
    }

    await db.transaction(async (tx) => {
        const [existing] = await tx
            .select({ id: sessionAttendance.id, status: sessionAttendance.status })
            .from(sessionAttendance)
            .where(and(
                eq(sessionAttendance.sessionId, sessionId),
                eq(sessionAttendance.studentId, studentId),
            ));

        // Already present → just return the link again (no window check, no deduction)
        if (existing && existing.status === "present") {
            return;
        }

        // ── Join window (Cairo time) ──────────────────────────────────────────
        const { today, currentTime } = cairoNow();
        if (String(session.sessionDate) !== today) {
            throw new BadRequest("This session is not scheduled for today");
        }
        const nowMin = toMinutes(currentTime);
        if (nowMin < toMinutes(session.timeFrom) - JOIN_OPEN_BEFORE_MIN) {
            throw new BadRequest("The session is not open for joining yet");
        }
        if (nowMin > toMinutes(session.timeTo)) {
            throw new BadRequest("The session has already ended");
        }

        // ── Re-Explanation balance logic ──────────────────────────────────────
        // Deduct balance unless the student already attended ALL of this
        // session's lessons in previous sessions.
        const sessionLessonRows = await tx
            .select({ lessonId: sessionLessons.lessonId })
            .from(sessionLessons)
            .where(eq(sessionLessons.sessionId, sessionId));

        const lessonIdsInSession = sessionLessonRows.map(r => r.lessonId);

        let shouldDeductBalance = true;

        if (session.sessionRelationalType === "Re-Explanation" && lessonIdsInSession.length > 0) {
            const previouslyAttendedRows = await tx
                .select({ lessonId: sessionLessons.lessonId })
                .from(sessionAttendance)
                .innerJoin(sessionLessons, eq(sessionAttendance.sessionId, sessionLessons.sessionId))
                .where(and(
                    eq(sessionAttendance.studentId, studentId),
                    eq(sessionAttendance.status, "present"),
                    sql`${sessionAttendance.sessionId} != ${sessionId}`,
                    inArray(sessionLessons.lessonId, lessonIdsInSession)
                ));

            const attendedLessonIdSet = new Set(previouslyAttendedRows.map(r => r.lessonId));
            if (lessonIdsInSession.every(id => attendedLessonIdSet.has(id))) {
                shouldDeductBalance = false;
            }
        }

        // ── Atomic balance deduction (no check-then-update race) ──────────────
        if (shouldDeductBalance) {
            const [result] = await tx
                .update(Student)
                .set({ livebalance: sql`${Student.livebalance} - 1` })
                .where(and(eq(Student.id, studentId), gt(Student.livebalance, 0)));

            if (!result || (result as any).affectedRows === 0) {
                throw new BadRequest("Insufficient live balance");
            }
        }

        // ── Record attendance ─────────────────────────────────────────────────
        const attendedAt = new Date();
        if (existing) {
            await tx.update(sessionAttendance)
                .set({ status: "present", attendedAt })
                .where(eq(sessionAttendance.id, existing.id));
        } else {
            await tx.insert(sessionAttendance).values({
                id: randomUUID(),
                sessionId,
                studentId,
                status: "present",
                attendedAt,
            });
        }

        // ── Unlock lesson content permanently (expiresAt = null) ──────────────
        if (lessonIdsInSession.length > 0) {
            const alreadyEnrolled = await tx
                .select({ lessonId: enrolledItems.lessonId })
                .from(enrolledItems)
                .where(and(
                    eq(enrolledItems.studentId, studentId),
                    eq(enrolledItems.status, "active"),
                    inArray(enrolledItems.lessonId, lessonIdsInSession)
                ));

            const enrolledLessonIdSet = new Set(alreadyEnrolled.map(r => r.lessonId).filter(Boolean));

            const newEnrollments = lessonIdsInSession
                .filter(id => !enrolledLessonIdSet.has(id))
                .map(lessonId => ({
                    id: randomUUID(),
                    studentId,
                    lessonId,
                    status: "active" as const,
                    expiresAt: null,
                }));

            if (newEnrollments.length > 0) {
                await tx.insert(enrolledItems).values(newEnrollments);
            }
        }
    });

    return SuccessResponse(res, { sessionLink: session.sessionLink });
};