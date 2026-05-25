"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardData = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../models/connection");
const Student_1 = require("../../models/schema/admin/Student");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
const upcomingSessionsCount = async (studentId) => {
    const today = new Date().toISOString().split("T")[0];
    const count = await connection_1.db
        .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.sessions.id})` })
        .from(schema_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(schema_1.sessions.sessionDate, new Date(today)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.sessions.id, connection_1.db.select({ sessionId: schema_1.sessionUsers.sessionId }).from(schema_1.sessionUsers).where((0, drizzle_orm_1.eq)(schema_1.sessionUsers.studentId, studentId))), (0, drizzle_orm_1.inArray)(schema_1.sessions.id, connection_1.db.select({ sessionId: schema_1.sessionGroups.sessionId }).from(schema_1.sessionGroups).where((0, drizzle_orm_1.inArray)(schema_1.sessionGroups.groupId, connection_1.db.select({ groupId: schema_1.groupStudents.groupId }).from(schema_1.groupStudents).where((0, drizzle_orm_1.eq)(schema_1.groupStudents.studentId, studentId))))))));
    return Number(count[0].count) || 0;
};
const getDashboardData = async (req, res) => {
    const studentId = getStudentId(req);
    const existingStudent = await connection_1.db.select().from(Student_1.Student).where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new Errors_1.NotFound("Student not found");
    }
    const dashboardData = {
        upcomingSessionsCount: await upcomingSessionsCount(studentId),
    };
    return (0, response_1.SuccessResponse)(res, dashboardData);
};
exports.getDashboardData = getDashboardData;
