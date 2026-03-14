// import { Request, Response } from "express";
// import { avg, count, desc, eq, and } from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { db } from "../../models/connection";
// import { category, courses, Student, teachers,  sessionRatings } from "../../models/schema";
// import { NotFound } from "../../Errors";
// import { sessions } from "../../models/schema/admin/Session";

// // جلب كل تقييمات Session معينة
// export const getSessionRatings = async (req: Request, res: Response) => {
//     const { sessionId } = req.params;
//     const { page = 1, limit = 20 } = req.query;
//     const offset = (Number(page) - 1) * Number(limit);

//     // التأكد من وجود الـ Session
//     const [session] = await db
//         .select({
//             id: sessions.id,
//             name: sessions.name,
//             teacherName: teachers.name,
//         })
//         .from(sessions)
//         .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
//         .where(eq(sessions.id, sessionId));

//     if (!session) {
//         throw new NotFound("Session not found");
//     }

//     // جلب الـ Ratings
//     const ratings = await db
//         .select({
//             id: sessionRatings.id,
//             rating: sessionRatings.rating,
//             comment: sessionRatings.comment,
//             createdAt: sessionRatings.createdAt,
//             studentId: Student.id,
//             studentFirstname: Student.firstname,
//             studentLastname: Student.lastname,
//             studentNickname: Student.nickname,
//             studentEmail: Student.email,
//         })
//         .from(sessionRatings)
//         .innerJoin(Student, eq(sessionRatings.studentId, Student.id))
//         .where(eq(sessionRatings.sessionId, sessionId))
//         .orderBy(desc(sessionRatings.createdAt))
//         .limit(Number(limit))
//         .offset(offset);

//     // حساب الـ Stats
//     const [stats] = await db
//         .select({
//             averageRating: avg(sessionRatings.rating),
//             totalRatings: count(sessionRatings.id),
//         })
//         .from(sessionRatings)
//         .where(eq(sessionRatings.sessionId, sessionId));

//     SuccessResponse(res, {
//         session: {
//             id: session.id,
//             name: session.name,
//             teacherName: session.teacherName
//         },
//         averageRating: stats.averageRating ? Number(stats.averageRating).toFixed(1) : 0,
//         totalRatings: Number(stats.totalRatings),
//         ratings: ratings.map(r => ({
//             id: r.id,
//             rating: r.rating,
//             comment: r.comment,
//             createdAt: r.createdAt,
//             student: {
//                 id: r.studentId,
//                 name: `${r.studentFirstname} ${r.studentLastname}`,
//                 nickname: r.studentNickname,
//                 email: r.studentEmail
//             }
//         }))
//     });
// };

// // جلب كل الـ Sessions مع الـ Ratings
// export const getAllSessionsWithRatings = async (req: Request, res: Response) => {
//     const { page = 1, limit = 10, teacherId, categoryId, courseId } = req.query;
//     const offset = (Number(page) - 1) * Number(limit);

//     const conditions = [];

//     if (teacherId) {
//         conditions.push(eq(sessions.teacherId, teacherId as string));
//     }
//     if (categoryId) {
//         conditions.push(eq(sessions.categoryId, categoryId as string));
//     }
//     if (courseId) {
//         conditions.push(eq(sessions.courseId, courseId as string));
//     }

//     const sessionsList = await db
//         .select({
//             id: sessions.id,
//             name: sessions.name,
//             sessionDate: sessions.sessionDate,
//             timeFrom: sessions.timeFrom,
//             timeTo: sessions.timeTo,
//             type: sessions.type,
//             lessonName: sessions.lessonName,
//             categoryName: category.name,
//             courseName: courses.name,
//             teacherId: sessions.teacherId,
//             teacherName: teachers.name,
//         })
//         .from(sessions)
//         .leftJoin(category, eq(sessions.categoryId, category.id))
//         .leftJoin(courses, eq(sessions.courseId, courses.id))
//         .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
//         .where(conditions.length > 0 ? and(...conditions) : undefined)
//         .orderBy(desc(sessions.sessionDate))
//         .limit(Number(limit))
//         .offset(offset);

//     // جلب الـ Ratings لكل Session
//     const sessionsWithRatings = await Promise.all(
//         sessionsList.map(async (session) => {
//             const [stats] = await db
//                 .select({
//                     averageRating: avg(sessionRatings.rating),
//                     totalRatings: count(sessionRatings.id),
//                 })
//                 .from(sessionRatings)
//                 .where(eq(sessionRatings.sessionId, session.id));

//             return {
//                 ...session,
//                 averageRating: stats.averageRating ? Number(stats.averageRating).toFixed(1) : 0,
//                 totalRatings: Number(stats.totalRatings)
//             };
//         })
//     );

//     SuccessResponse(res, sessionsWithRatings);
// };
