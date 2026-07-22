import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { sessionLessons, sessions, sessionUsers, sessionGroups } from "../../models/schema/admin/Session";
import { lessons, sessionAttendance, chapters } from "../../models/schema";
import { groups, groupStudents } from "../../models/schema/admin/Groups";
import { teachers } from "../../models/schema/admin/teacher";
import { category } from "../../models/schema/admin/category";
import { courses } from "../../models/schema/admin/courses";
import { Student } from "../../models/schema/admin/Student";
import { eq, and, gte, lt, or, inArray, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

export const getUpcomingSessions = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const today = new Date().toISOString().split("T")[0];

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
            gte(sessions.sessionDate, new Date(today)),
            or(
                inArray(sessions.id, db.select({ sessionId: sessionUsers.sessionId }).from(sessionUsers).where(eq(sessionUsers.studentId, studentId))),
                inArray(sessions.id, db.select({ sessionId: sessionGroups.sessionId }).from(sessionGroups).where(inArray(sessionGroups.groupId, db.select({ groupId: groupStudents.groupId }).from(groupStudents).where(eq(groupStudents.studentId, studentId)))))
            )
        ))
        .orderBy(sql`${sessions.sessionDate} ASC`);

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

    return SuccessResponse(res, Array.from(sessionsMap.values()));

};

export const getSessionHistory = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const today = new Date().toISOString().split("T")[0];

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
            attendanceStatus: sessionAttendance.status,
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
        .leftJoin(sessionAttendance, and(
            eq(sessionAttendance.sessionId, sessions.id),
            eq(sessionAttendance.studentId, studentId)
        ))
        .leftJoin(sessionLessons, eq(sessions.id, sessionLessons.sessionId))
        .leftJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(chapters.courseId, courses.id))
        .where(and(
            lt(sessions.sessionDate, new Date(today)),
            or(
                inArray(sessions.id, db.select({ sessionId: sessionUsers.sessionId }).from(sessionUsers).where(eq(sessionUsers.studentId, studentId))),
                inArray(sessions.id, db.select({ sessionId: sessionGroups.sessionId }).from(sessionGroups).where(inArray(sessionGroups.groupId, db.select({ groupId: groupStudents.groupId }).from(groupStudents).where(eq(groupStudents.studentId, studentId)))))
            )
        ))
        .orderBy(sql`${sessions.sessionDate} DESC`);

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
                attendanceStatus: row.attendanceStatus,
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

    return SuccessResponse(res, Array.from(pastSessionsMap.values()));
};

export const joinSession = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { sessionId } = req.params;

    const [session] = await db
        .select({
            id: sessions.id,
            sessionLink: sessions.session_link,
            sessionRelationalType: sessions.sessionRelationalType,
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
        if (existing) {
            await tx.update(sessionAttendance)
                .set({ status: "present", attendedAt: new Date() })
                .where(eq(sessionAttendance.id, existing.id));
        } else {
            await tx.insert(sessionAttendance).values({
                id: randomUUID(),
                sessionId,
                studentId,
                status: "present",
                attendedAt: new Date(),
            });
        }
    });

    return SuccessResponse(res, { sessionLink: session.sessionLink });
};
