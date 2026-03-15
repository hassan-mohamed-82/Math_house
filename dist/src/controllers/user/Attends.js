"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinSession = exports.getSessionHistory = exports.getUpcomingSessions = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const Session_1 = require("../../models/schema/admin/Session");
const schema_1 = require("../../models/schema");
const Groups_1 = require("../../models/schema/admin/Groups");
const courses_1 = require("../../models/schema/admin/courses");
const Student_1 = require("../../models/schema/admin/Student");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
const getUpcomingSessions = async (req, res) => {
    const studentId = getStudentId(req);
    const today = new Date().toISOString().split("T")[0];
    const ExistingStudent = await connection_1.db.select().from(Student_1.Student).where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (ExistingStudent.length === 0) {
        throw new Errors_1.NotFound("Student not found");
    }
    const rawSessions = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        sessionLink: Session_1.sessions.session_link,
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
        },
        chapter: {
            id: schema_1.chapters.id,
            name: schema_1.chapters.name,
        },
        course: {
            id: courses_1.courses.id,
            name: courses_1.courses.name,
        }
    })
        .from(Session_1.sessions)
        .leftJoin(Session_1.sessionLessons, (0, drizzle_orm_1.eq)(Session_1.sessions.id, Session_1.sessionLessons.sessionId))
        .leftJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(Session_1.sessionLessons.lessonId, schema_1.lessons.id))
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courses_1.courses.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(Session_1.sessions.sessionDate, new Date(today)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(Session_1.sessions.id, connection_1.db.select({ sessionId: Session_1.sessionUsers.sessionId }).from(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId))), (0, drizzle_orm_1.inArray)(Session_1.sessions.groupId, connection_1.db.select({ groupId: Groups_1.groupStudents.groupId }).from(Groups_1.groupStudents).where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, studentId))))))
        .orderBy((0, drizzle_orm_1.sql) `${Session_1.sessions.sessionDate} ASC`);
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
            if (!session.lessons.some((l) => l.id === row.lesson.id)) {
                session.lessons.push({
                    ...row.lesson,
                    chapter: row.chapter,
                    course: row.course
                });
            }
        }
    });
    return (0, response_1.SuccessResponse)(res, Array.from(sessionsMap.values()));
};
exports.getUpcomingSessions = getUpcomingSessions;
const getSessionHistory = async (req, res) => {
    const studentId = getStudentId(req);
    const today = new Date().toISOString().split("T")[0];
    const ExistingStudent = await connection_1.db.select().from(Student_1.Student).where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (ExistingStudent.length === 0) {
        throw new Errors_1.NotFound("Student not found");
    }
    const rawPastSessions = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        sessionLink: Session_1.sessions.session_link,
        attendanceStatus: schema_1.sessionAttendance.status,
        lesson: {
            id: schema_1.lessons.id,
            name: schema_1.lessons.name,
        },
        chapter: {
            id: schema_1.chapters.id,
            name: schema_1.chapters.name,
        },
        course: {
            id: courses_1.courses.id,
            name: courses_1.courses.name,
        }
    })
        .from(Session_1.sessions)
        .leftJoin(schema_1.sessionAttendance, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionAttendance.sessionId, Session_1.sessions.id), (0, drizzle_orm_1.eq)(schema_1.sessionAttendance.studentId, studentId)))
        .leftJoin(Session_1.sessionLessons, (0, drizzle_orm_1.eq)(Session_1.sessions.id, Session_1.sessionLessons.sessionId))
        .leftJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(Session_1.sessionLessons.lessonId, schema_1.lessons.id))
        .leftJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courses_1.courses.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.lt)(Session_1.sessions.sessionDate, new Date(today)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(Session_1.sessions.id, connection_1.db.select({ sessionId: Session_1.sessionUsers.sessionId }).from(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId))), (0, drizzle_orm_1.inArray)(Session_1.sessions.groupId, connection_1.db.select({ groupId: Groups_1.groupStudents.groupId }).from(Groups_1.groupStudents).where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, studentId))))))
        .orderBy((0, drizzle_orm_1.sql) `${Session_1.sessions.sessionDate} DESC`);
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
            if (!session.lessons.some((l) => l.id === row.lesson.id)) {
                session.lessons.push({
                    ...row.lesson,
                    chapter: row.chapter,
                    course: row.course
                });
            }
        }
    });
    return (0, response_1.SuccessResponse)(res, Array.from(pastSessionsMap.values()));
};
exports.getSessionHistory = getSessionHistory;
const joinSession = async (req, res) => {
    const studentId = getStudentId(req);
    const { sessionId } = req.params;
    const [session] = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        sessionLink: Session_1.sessions.session_link,
        groupId: Session_1.sessions.groupId,
    })
        .from(Session_1.sessions)
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, sessionId));
    if (!session)
        throw new Errors_1.NotFound("Session not found");
    const [directMembership] = await connection_1.db
        .select({ id: Session_1.sessionUsers.id })
        .from(Session_1.sessionUsers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, sessionId), (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId)));
    let hasAccess = !!directMembership;
    if (!hasAccess && session.groupId) {
        const [groupMembership] = await connection_1.db
            .select({ id: Groups_1.groupStudents.id })
            .from(Groups_1.groupStudents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, session.groupId), (0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, studentId)));
        hasAccess = !!groupMembership;
    }
    if (!hasAccess) {
        throw new Errors_1.NotFound("You are not enrolled in this session");
    }
    await connection_1.db.transaction(async (tx) => {
        // Fetch existing inside transaction to prevent race conditions
        const [existing] = await tx
            .select({ id: schema_1.sessionAttendance.id, status: schema_1.sessionAttendance.status })
            .from(schema_1.sessionAttendance)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.sessionAttendance.sessionId, sessionId), (0, drizzle_orm_1.eq)(schema_1.sessionAttendance.studentId, studentId)));
        if (existing && existing.status === "present") {
            return; // Already marked present
        }
        // Fetch user inside transaction before deducting balance
        const [student] = await tx
            .select({ liveBalance: Student_1.Student.livebalance })
            .from(Student_1.Student)
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
        if (!student || student.liveBalance <= 0) {
            throw new Errors_1.BadRequest("Insufficient live balance");
        }
        if (existing) {
            await tx.update(schema_1.sessionAttendance)
                .set({ status: "present", attendedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.sessionAttendance.id, existing.id));
        }
        else {
            await tx.insert(schema_1.sessionAttendance).values({
                id: (0, crypto_1.randomUUID)(),
                sessionId,
                studentId,
                status: "present",
                attendedAt: new Date(),
            });
        }
        // Reduce balance
        await tx.update(Student_1.Student)
            .set({ livebalance: (0, drizzle_orm_1.sql) `${Student_1.Student.livebalance} - 1` })
            .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    });
    return (0, response_1.SuccessResponse)(res, { sessionLink: session.sessionLink });
};
exports.joinSession = joinSession;
