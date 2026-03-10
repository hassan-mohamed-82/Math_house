"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinSession = exports.getSessionHistory = exports.getUpcomingSessions = void 0;
const connection_1 = require("../../models/connection");
const Session_1 = require("../../models/schema/admin/Session");
const SessionAttendance_1 = require("../../models/schema/admin/SessionAttendance");
const Groups_1 = require("../../models/schema/admin/Groups");
const teacher_1 = require("../../models/schema/admin/teacher");
const category_1 = require("../../models/schema/admin/category");
const courses_1 = require("../../models/schema/admin/courses");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
// ===================== GET UPCOMING SESSIONS =====================
const getUpcomingSessions = async (req, res) => {
    const studentId = getStudentId(req);
    const today = new Date().toISOString().split("T")[0];
    // 1. Get groups the student belongs to
    const studentGroups = await connection_1.db
        .select({ groupId: Groups_1.groupStudents.groupId })
        .from(Groups_1.groupStudents)
        .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, studentId));
    const groupIds = studentGroups.map(g => g.groupId);
    // 2. Get sessions where the student is directly added
    const directSessionIds = await connection_1.db
        .select({ sessionId: Session_1.sessionUsers.sessionId })
        .from(Session_1.sessionUsers)
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId));
    const directIds = directSessionIds.map(s => s.sessionId);
    // 3. Build conditions: direct sessions OR group sessions
    const conditions = [];
    if (directIds.length > 0) {
        conditions.push((0, drizzle_orm_1.inArray)(Session_1.sessions.id, directIds));
    }
    if (groupIds.length > 0) {
        conditions.push((0, drizzle_orm_1.inArray)(Session_1.sessions.groupId, groupIds));
    }
    if (conditions.length === 0) {
        return (0, response_1.SuccessResponse)(res, []);
    }
    const upcomingSessions = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        categoryName: category_1.category.name,
        courseName: courses_1.courses.name,
        lessonName: Session_1.sessions.lessonName,
        type: Session_1.sessions.type,
        groupName: Groups_1.groups.name,
        teacherName: teacher_1.teachers.name,
        sessionLink: Session_1.sessions.session_link,
        materialLink: Session_1.sessions.material_link,
    })
        .from(Session_1.sessions)
        .leftJoin(category_1.category, (0, drizzle_orm_1.eq)(Session_1.sessions.categoryId, category_1.category.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(Session_1.sessions.courseId, courses_1.courses.id))
        .leftJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessions.groupId, Groups_1.groups.id))
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacher_1.teachers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(Session_1.sessions.sessionDate, new Date(today)), (0, drizzle_orm_1.or)(...conditions)))
        .orderBy(Session_1.sessions.sessionDate, Session_1.sessions.timeFrom);
    (0, response_1.SuccessResponse)(res, upcomingSessions);
};
exports.getUpcomingSessions = getUpcomingSessions;
// ===================== GET SESSION HISTORY =====================
const getSessionHistory = async (req, res) => {
    const studentId = getStudentId(req);
    const today = new Date().toISOString().split("T")[0];
    // 1. Get groups the student belongs to
    const studentGroups = await connection_1.db
        .select({ groupId: Groups_1.groupStudents.groupId })
        .from(Groups_1.groupStudents)
        .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, studentId));
    const groupIds = studentGroups.map(g => g.groupId);
    // 2. Direct session IDs
    const directSessionIds = await connection_1.db
        .select({ sessionId: Session_1.sessionUsers.sessionId })
        .from(Session_1.sessionUsers)
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId));
    const directIds = directSessionIds.map(s => s.sessionId);
    // 3. Build conditions
    const conditions = [];
    if (directIds.length > 0) {
        conditions.push((0, drizzle_orm_1.inArray)(Session_1.sessions.id, directIds));
    }
    if (groupIds.length > 0) {
        conditions.push((0, drizzle_orm_1.inArray)(Session_1.sessions.groupId, groupIds));
    }
    if (conditions.length === 0) {
        return (0, response_1.SuccessResponse)(res, []);
    }
    const pastSessions = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        categoryName: category_1.category.name,
        courseName: courses_1.courses.name,
        lessonName: Session_1.sessions.lessonName,
        type: Session_1.sessions.type,
        groupName: Groups_1.groups.name,
        teacherName: teacher_1.teachers.name,
        attendanceStatus: SessionAttendance_1.sessionAttendance.status,
        attendedAt: SessionAttendance_1.sessionAttendance.attendedAt,
    })
        .from(Session_1.sessions)
        .leftJoin(category_1.category, (0, drizzle_orm_1.eq)(Session_1.sessions.categoryId, category_1.category.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(Session_1.sessions.courseId, courses_1.courses.id))
        .leftJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessions.groupId, Groups_1.groups.id))
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacher_1.teachers.id))
        .leftJoin(SessionAttendance_1.sessionAttendance, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(SessionAttendance_1.sessionAttendance.sessionId, Session_1.sessions.id), (0, drizzle_orm_1.eq)(SessionAttendance_1.sessionAttendance.studentId, studentId)))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.lt)(Session_1.sessions.sessionDate, new Date(today)), (0, drizzle_orm_1.or)(...conditions)))
        .orderBy((0, drizzle_orm_1.sql) `${Session_1.sessions.sessionDate} DESC`);
    (0, response_1.SuccessResponse)(res, pastSessions);
};
exports.getSessionHistory = getSessionHistory;
// ===================== JOIN SESSION (MARK ATTENDANCE) =====================
const joinSession = async (req, res) => {
    const studentId = getStudentId(req);
    const { sessionId } = req.params;
    // 1. Check session exists
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
    // 2. Check if the student belongs to this session (direct OR through group)
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
    // 3. Upsert attendance — mark as present
    const [existing] = await connection_1.db
        .select({ id: SessionAttendance_1.sessionAttendance.id })
        .from(SessionAttendance_1.sessionAttendance)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(SessionAttendance_1.sessionAttendance.sessionId, sessionId), (0, drizzle_orm_1.eq)(SessionAttendance_1.sessionAttendance.studentId, studentId)));
    if (existing) {
        await connection_1.db.update(SessionAttendance_1.sessionAttendance)
            .set({ status: "present", attendedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(SessionAttendance_1.sessionAttendance.id, existing.id));
    }
    else {
        await connection_1.db.insert(SessionAttendance_1.sessionAttendance).values({
            sessionId,
            studentId,
            status: "present",
            attendedAt: new Date(),
        });
    }
    (0, response_1.SuccessResponse)(res, { sessionLink: session.sessionLink });
};
exports.joinSession = joinSession;
