import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { sessionLessons, sessions, sessionUsers, sessionGroups, sessionStudentPdfs } from "../../models/schema/admin/Session";
import { lessons, lessonIdeas, sessionAttendance, chapters } from "../../models/schema";
import { groups, groupStudents } from "../../models/schema/admin/Groups";
import { teachers } from "../../models/schema/admin/teacher";
import { category } from "../../models/schema/admin/category";
import { courses } from "../../models/schema/admin/courses";
import { Student } from "../../models/schema/admin/Student";
import { enrolledItems } from "../../models/schema/user/enrolledItems";
import { eq, and, gte, lt, or, inArray, sql, gt, asc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { generateSecureStreamUrl } from "../../drive/services/services";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
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

export const getUpcomingSessions = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toISOString().split("T")[1].slice(0, 8); // "HH:MM:SS"

    const ExistingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
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
            }
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
            or(
                inArray(sessions.id, db.select({ sessionId: sessionUsers.sessionId }).from(sessionUsers).where(eq(sessionUsers.studentId, studentId))),
                inArray(sessions.id, db.select({ sessionId: sessionGroups.sessionId }).from(sessionGroups).where(inArray(sessionGroups.groupId, db.select({ groupId: groupStudents.groupId }).from(groupStudents).where(eq(groupStudents.studentId, studentId)))))
            )
        ))
        .orderBy(sql`${sessions.sessionDate} ASC, ${sessions.timeFrom} ASC`);

    const sessionsMap = new Map();
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
                lessons: []
            });
        }
        if (row.lesson && row.lesson.id) {
            const session = sessionsMap.get(row.id);
            if (!session.lessons.some((l: any) => l.id === row.lesson!.id)) {
                session.lessons.push({
                    ...row.lesson,
                    chapter: row.chapter,
                    course: row.course
                });
            }
        }
    });

    // Check for personalized per-student blank PDFs for Mistakes sessions
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

        studentPdfs.forEach(sp => {
            studentPdfMap.set(sp.sessionId, sp.session_pdf);
        });
    }

    const formattedSessions = Array.from(sessionsMap.values()).map((s: any) => {
        const personalizedPdf = studentPdfMap.get(s.id);
        return {
            ...s,
            session_pdf: s.sessionRelationalType === "Mistakes"
                ? (personalizedPdf ?? s.session_pdf ?? null)
                : (s.session_pdf ?? null),
        };
    });

    return SuccessResponse(res, formattedSessions);
};

export const getSessionHistory = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toISOString().split("T")[1].slice(0, 8);

    const ExistingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
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
            }
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
            or(
                inArray(sessions.id, db.select({ sessionId: sessionUsers.sessionId }).from(sessionUsers).where(eq(sessionUsers.studentId, studentId))),
                inArray(sessions.id, db.select({ sessionId: sessionGroups.sessionId }).from(sessionGroups).where(inArray(sessionGroups.groupId, db.select({ groupId: groupStudents.groupId }).from(groupStudents).where(eq(groupStudents.studentId, studentId)))))
            )
        ))
        .orderBy(sql`${sessions.sessionDate} DESC, ${sessions.timeFrom} DESC`);

    const pastSessionsMap = new Map();
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
                lessons: []
            });
        }
        if (row.lesson && row.lesson.id) {
            const session = pastSessionsMap.get(row.id);
            if (!session.lessons.some((l: any) => l.id === row.lesson!.id)) {
                session.lessons.push({
                    ...row.lesson,
                    chapter: row.chapter,
                    course: row.course
                });
            }
        }
    });

    const pastSessionIds = Array.from(pastSessionsMap.keys());

    // 1. Fetch per-student PDFs for Mistakes sessions
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

        studentPdfs.forEach(sp => {
            studentPdfMap.set(sp.sessionId, {
                session_pdf: sp.session_pdf,
                teacher_explanation_pdf: sp.teacher_explanation_pdf,
            });
        });
    }

    // 2. Fetch lesson ideas for attended sessions (attendanceStatus === "present")
    const attendedLessonIds: string[] = [];
    Array.from(pastSessionsMap.values()).forEach((s: any) => {
        if (s.attendanceStatus === "present") {
            s.lessons.forEach((l: any) => {
                if (l.id) attendedLessonIds.push(l.id);
            });
        }
    });

    const uniqueLessonIds = Array.from(new Set(attendedLessonIds));
    const ideasByLesson = new Map<string, any[]>();

    if (uniqueLessonIds.length > 0) {
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
            .where(inArray(lessonIdeas.lessonId, uniqueLessonIds))
            .orderBy(asc(lessonIdeas.ideaOrder));

        ideas.forEach(idea => {
            if (!ideasByLesson.has(idea.lessonId)) ideasByLesson.set(idea.lessonId, []);
            ideasByLesson.get(idea.lessonId)!.push(resolveIdea(idea));
        });
    }

    // 3. Format final response
    const formattedSessions = Array.from(pastSessionsMap.values()).map((s: any) => {
        const isAttended = s.attendanceStatus === "present";
        const studentPdf = studentPdfMap.get(s.id);

        const finalSessionPdf = s.sessionRelationalType === "Mistakes"
            ? (studentPdf?.session_pdf ?? s.session_pdf ?? null)
            : (s.session_pdf ?? null);

        const finalTeacherPdf = s.sessionRelationalType === "Mistakes"
            ? (studentPdf?.teacher_explanation_pdf ?? s.teacher_explanation_pdf ?? null)
            : (s.teacher_explanation_pdf ?? null);

        const formattedLessons = s.lessons.map((l: any) => ({
            ...l,
            ideas: isAttended ? (ideasByLesson.get(l.id) || []) : [],
            ideasLocked: !isAttended,
        }));

        return {
            ...s,
            session_pdf: finalSessionPdf,
            teacher_explanation_pdf: finalTeacherPdf,
            lessons: formattedLessons,
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
            contentAccessDays: sessions.contentAccessDays,
            session_pdf: sessions.session_pdf,
            teacher_explanation_pdf: sessions.teacher_explanation_pdf,
            teacherId: sessions.teacherId,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) throw new NotFound("Session not found");

    // Check enrollment (direct or via group)
    const [directMembership] = await db
        .select({ id: sessionUsers.id })
        .from(sessionUsers)
        .where(and(
            eq(sessionUsers.sessionId, sessionId),
            eq(sessionUsers.studentId, studentId)
        ));

    let hasAccess = !!directMembership;
    if (!hasAccess) {
        const [groupMembership] = await db
            .select({ id: sessionGroups.id })
            .from(sessionGroups)
            .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
            .where(and(
                eq(sessionGroups.sessionId, sessionId),
                eq(groupStudents.studentId, studentId)
            ));
        hasAccess = !!groupMembership;
    }

    if (!hasAccess) {
        throw new NotFound("You are not enrolled in this session");
    }

    // Teacher info
    const [teacher] = await db
        .select({
            id: teachers.id,
            name: teachers.name,
            avatar: teachers.avatar,
        })
        .from(teachers)
        .where(eq(teachers.id, session.teacherId));

    // Attendance
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

    // PDFs resolution (per-student for Mistakes, else session-level)
    let finalSessionPdf = session.session_pdf;
    let finalTeacherPdf = session.teacher_explanation_pdf;

    if (session.sessionRelationalType === "Mistakes") {
        const [studentPdf] = await db
            .select({
                session_pdf: sessionStudentPdfs.session_pdf,
                teacher_explanation_pdf: sessionStudentPdfs.teacher_explanation_pdf,
            })
            .from(sessionStudentPdfs)
            .where(and(
                eq(sessionStudentPdfs.sessionId, sessionId),
                eq(sessionStudentPdfs.studentId, studentId)
            ));

        if (studentPdf) {
            finalSessionPdf = studentPdf.session_pdf ?? session.session_pdf;
            finalTeacherPdf = studentPdf.teacher_explanation_pdf ?? session.teacher_explanation_pdf;
        }
    }

    // Lessons resolution
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

    const lessonIds = sessionLessonRows.map(r => r.lesson.id);
    const ideasByLesson = new Map<string, any[]>();

    if (isAttended && lessonIds.length > 0) {
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
    }

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
            contentAccessDays: session.contentAccessDays,
            session_pdf: finalSessionPdf ?? null,
            teacher_explanation_pdf: finalTeacherPdf ?? null,
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
            sessionLink: sessions.session_link,
            sessionRelationalType: sessions.sessionRelationalType,
            contentAccessDays: sessions.contentAccessDays,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId));

    if (!session) throw new NotFound("Session not found");

    const [directMembership] = await db
        .select({ id: sessionUsers.id })
        .from(sessionUsers)
        .where(and(
            eq(sessionUsers.sessionId, sessionId),
            eq(sessionUsers.studentId, studentId),
        ));

    let hasAccess = !!directMembership;

    if (!hasAccess) {
        const [groupMembership] = await db
            .select({ id: sessionGroups.id })
            .from(sessionGroups)
            .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
            .where(and(
                eq(sessionGroups.sessionId, sessionId),
                eq(groupStudents.studentId, studentId),
            ));
        hasAccess = !!groupMembership;
    }

    if (!hasAccess) {
        throw new NotFound("You are not enrolled in this session");
    }

    await db.transaction(async (tx) => {
        // Check if student already has an attendance record for this session
        const [existing] = await tx
            .select({ id: sessionAttendance.id, status: sessionAttendance.status })
            .from(sessionAttendance)
            .where(and(
                eq(sessionAttendance.sessionId, sessionId),
                eq(sessionAttendance.studentId, studentId),
            ));

        if (existing && existing.status === "present") {
            return; // Already marked present, nothing to do
        }

        // ── Re-Explanation balance logic ──────────────────────────────────────
        // For Re-Explanation sessions: only deduct balance if the student has
        // NOT attended at least one of the session's lessons in a prior session.
        // If ALL lessons were already covered in previous sessions → no deduction.
        let shouldDeductBalance = true;

        if (session.sessionRelationalType === "Re-Explanation") {
            // 1. Get all lessons linked to this Re-Explanation session
            const sessionLessonRows = await tx
                .select({ lessonId: sessionLessons.lessonId })
                .from(sessionLessons)
                .where(eq(sessionLessons.sessionId, sessionId));

            const lessonIdsInSession = sessionLessonRows.map(r => r.lessonId);

            if (lessonIdsInSession.length > 0) {
                // 2. Find which of those lessons the student has already attended
                //    in OTHER sessions (not the current Re-Explanation session itself)
                const previouslyAttendedRows = await tx
                    .select({ lessonId: sessionLessons.lessonId })
                    .from(sessionAttendance)
                    .innerJoin(
                        sessionLessons,
                        eq(sessionAttendance.sessionId, sessionLessons.sessionId)
                    )
                    .where(and(
                        eq(sessionAttendance.studentId, studentId),
                        eq(sessionAttendance.status, "present"),
                        // Only from OTHER sessions, not the current one
                        sql`${sessionAttendance.sessionId} != ${sessionId}`,
                        inArray(sessionLessons.lessonId, lessonIdsInSession)
                    ));

                const attendedLessonIdSet = new Set(previouslyAttendedRows.map(r => r.lessonId));

                // 3. If ALL lessons in this session were previously attended → free re-entry
                const allLessonsPreviouslyAttended = lessonIdsInSession.every(
                    lessonId => attendedLessonIdSet.has(lessonId)
                );

                if (allLessonsPreviouslyAttended) {
                    shouldDeductBalance = false;
                }
                // else: at least one lesson is new → deduct balance as normal
            }
        }

        // ── Balance check and deduction ───────────────────────────────────────
        if (shouldDeductBalance) {
            const [student] = await tx
                .select({ liveBalance: Student.livebalance })
                .from(Student)
                .where(eq(Student.id, studentId));

            if (!student || student.liveBalance <= 0) {
                throw new BadRequest("Insufficient live balance");
            }

            await tx.update(Student)
                .set({ livebalance: sql`${Student.livebalance} - 1` })
                .where(eq(Student.id, studentId));
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

        // ── Auto-unlock lesson content for this session ───────────────────────
        // Compute expiresAt from contentAccessDays (null → permanent access)
        const expiresAt: Date | null = session.contentAccessDays != null
            ? (() => {
                const d = new Date(attendedAt);
                d.setDate(d.getDate() + session.contentAccessDays!);
                return d;
            })()
            : null;

        const sessionLessonRows = await tx
            .select({ lessonId: sessionLessons.lessonId })
            .from(sessionLessons)
            .where(eq(sessionLessons.sessionId, sessionId));

        if (sessionLessonRows.length > 0) {
            const lessonIds = sessionLessonRows.map(r => r.lessonId);

            // Find lessons already enrolled to avoid duplicates
            const alreadyEnrolled = await tx
                .select({ lessonId: enrolledItems.lessonId })
                .from(enrolledItems)
                .where(
                    and(
                        eq(enrolledItems.studentId, studentId),
                        eq(enrolledItems.status, "active"),
                        inArray(enrolledItems.lessonId, lessonIds)
                    )
                );

            const enrolledLessonIdSet = new Set(
                alreadyEnrolled.map(r => r.lessonId).filter(Boolean)
            );

            const newEnrollments = lessonIds
                .filter(id => !enrolledLessonIdSet.has(id))
                .map(lessonId => ({
                    id: randomUUID(),
                    studentId,
                    lessonId,
                    status: "active" as const,
                    expiresAt,
                }));

            if (newEnrollments.length > 0) {
                await tx.insert(enrolledItems).values(newEnrollments);
            }
        }
    });

    return SuccessResponse(res, { sessionLink: session.sessionLink });
};
