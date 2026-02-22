"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSessionsWithRatings = exports.getSessionRatings = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const Errors_1 = require("../../Errors");
const Session_1 = require("../../models/schema/admin/Session");
// جلب كل تقييمات Session معينة
const getSessionRatings = async (req, res) => {
    const { sessionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    // التأكد من وجود الـ Session
    const [session] = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        teacherName: schema_1.teachers.name,
    })
        .from(Session_1.sessions)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, sessionId));
    if (!session) {
        throw new Errors_1.NotFound("Session not found");
    }
    // جلب الـ Ratings
    const ratings = await connection_1.db
        .select({
        id: schema_1.sessionRatings.id,
        rating: schema_1.sessionRatings.rating,
        comment: schema_1.sessionRatings.comment,
        createdAt: schema_1.sessionRatings.createdAt,
        studentId: schema_1.Student.id,
        studentFirstname: schema_1.Student.firstname,
        studentLastname: schema_1.Student.lastname,
        studentNickname: schema_1.Student.nickname,
        studentEmail: schema_1.Student.email,
    })
        .from(schema_1.sessionRatings)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.sessionRatings.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatings.sessionId, sessionId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.sessionRatings.createdAt))
        .limit(Number(limit))
        .offset(offset);
    // حساب الـ Stats
    const [stats] = await connection_1.db
        .select({
        averageRating: (0, drizzle_orm_1.avg)(schema_1.sessionRatings.rating),
        totalRatings: (0, drizzle_orm_1.count)(schema_1.sessionRatings.id),
    })
        .from(schema_1.sessionRatings)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionRatings.sessionId, sessionId));
    (0, response_1.SuccessResponse)(res, {
        session: {
            id: session.id,
            name: session.name,
            teacherName: session.teacherName
        },
        averageRating: stats.averageRating ? Number(stats.averageRating).toFixed(1) : 0,
        totalRatings: Number(stats.totalRatings),
        ratings: ratings.map(r => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
            student: {
                id: r.studentId,
                name: `${r.studentFirstname} ${r.studentLastname}`,
                nickname: r.studentNickname,
                email: r.studentEmail
            }
        }))
    });
};
exports.getSessionRatings = getSessionRatings;
// جلب كل الـ Sessions مع الـ Ratings
const getAllSessionsWithRatings = async (req, res) => {
    const { page = 1, limit = 10, teacherId, categoryId, courseId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (teacherId) {
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacherId));
    }
    if (categoryId) {
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.categoryId, categoryId));
    }
    if (courseId) {
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.courseId, courseId));
    }
    const sessionsList = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        type: Session_1.sessions.type,
        lessonName: Session_1.sessions.lessonName,
        categoryName: schema_1.category.name,
        courseName: schema_1.courses.name,
        teacherId: Session_1.sessions.teacherId,
        teacherName: schema_1.teachers.name,
    })
        .from(Session_1.sessions)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(Session_1.sessions.categoryId, schema_1.category.id))
        .leftJoin(schema_1.courses, (0, drizzle_orm_1.eq)(Session_1.sessions.courseId, schema_1.courses.id))
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, schema_1.teachers.id))
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(Session_1.sessions.sessionDate))
        .limit(Number(limit))
        .offset(offset);
    // جلب الـ Ratings لكل Session
    const sessionsWithRatings = await Promise.all(sessionsList.map(async (session) => {
        const [stats] = await connection_1.db
            .select({
            averageRating: (0, drizzle_orm_1.avg)(schema_1.sessionRatings.rating),
            totalRatings: (0, drizzle_orm_1.count)(schema_1.sessionRatings.id),
        })
            .from(schema_1.sessionRatings)
            .where((0, drizzle_orm_1.eq)(schema_1.sessionRatings.sessionId, session.id));
        return {
            ...session,
            averageRating: stats.averageRating ? Number(stats.averageRating).toFixed(1) : 0,
            totalRatings: Number(stats.totalRatings)
        };
    }));
    (0, response_1.SuccessResponse)(res, sessionsWithRatings);
};
exports.getAllSessionsWithRatings = getAllSessionsWithRatings;
