// import { Request, Response } from "express";
// import { db } from "../../models/connection";
// import { sessions, sessionUsers } from "../../models/schema/admin/Session";
// import { sessionAttendance } from "../../models/schema/admin/SessionAttendance";
// import { groups, groupStudents } from "../../models/schema/admin/Groups";
// import { teachers } from "../../models/schema/admin/teacher";
// import { category } from "../../models/schema/admin/category";
// import { courses } from "../../models/schema/admin/courses";
// import { Student } from "../../models/schema/admin/Student";
// import { eq, and, gte, lt, or, inArray, sql } from "drizzle-orm";
// import { SuccessResponse } from "../../utils/response";
// import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";

// const getStudentId = (req: Request): string => {
//     if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
//     return req.user.id;
// };

// // ===================== GET UPCOMING SESSIONS =====================
// export const getUpcomingSessions = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const today = new Date().toISOString().split("T")[0];

//     // 1. Get groups the student belongs to
//     const studentGroups = await db
//         .select({ groupId: groupStudents.groupId })
//         .from(groupStudents)
//         .where(eq(groupStudents.studentId, studentId));

//     const groupIds = studentGroups.map(g => g.groupId);

//     // 2. Get sessions where the student is directly added
//     const directSessionIds = await db
//         .select({ sessionId: sessionUsers.sessionId })
//         .from(sessionUsers)
//         .where(eq(sessionUsers.studentId, studentId));

//     const directIds = directSessionIds.map(s => s.sessionId);

//     // 3. Build conditions: direct sessions OR group sessions
//     const conditions = [];
//     if (directIds.length > 0) {
//         conditions.push(inArray(sessions.id, directIds));
//     }
//     if (groupIds.length > 0) {
//         conditions.push(inArray(sessions.groupId, groupIds));
//     }

//     // Get student's live balance
//     const [student] = await db
//         .select({ liveBalance: Student.livebalance })
//         .from(Student)
//         .where(eq(Student.id, studentId));

//     const liveBalance = student?.liveBalance ?? 0;

//     if (conditions.length === 0) {
//         return SuccessResponse(res, { liveBalance, sessions: [] });
//     }

//     const upcomingSessions = await db
//         .select({
//             id: sessions.id,
//             name: sessions.name,
//             sessionDate: sessions.sessionDate,
//             timeFrom: sessions.timeFrom,
//             timeTo: sessions.timeTo,
//             categoryName: category.name,
//             courseName: courses.name,
//             lessonName: sessions.lessonName,
//             type: sessions.type,
//             groupName: groups.name,
//             teacherName: teachers.name,
//             sessionLink: sessions.session_link,
//             materialLink: sessions.material_link,
//         })
//         .from(sessions)
//         .leftJoin(category, eq(sessions.categoryId, category.id))
//         .leftJoin(courses, eq(sessions.courseId, courses.id))
//         .leftJoin(groups, eq(sessions.groupId, groups.id))
//         .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
//         .where(and(
//             gte(sessions.sessionDate, new Date(today)),
//             or(...conditions),
//         ))
//         .orderBy(sessions.sessionDate, sessions.timeFrom);

//     SuccessResponse(res, { liveBalance, sessions: upcomingSessions });
// };

// // ===================== GET SESSION HISTORY =====================
// export const getSessionHistory = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const today = new Date().toISOString().split("T")[0];

//     // 1. Get groups the student belongs to
//     const studentGroups = await db
//         .select({ groupId: groupStudents.groupId })
//         .from(groupStudents)
//         .where(eq(groupStudents.studentId, studentId));

//     const groupIds = studentGroups.map(g => g.groupId);

//     // 2. Direct session IDs
//     const directSessionIds = await db
//         .select({ sessionId: sessionUsers.sessionId })
//         .from(sessionUsers)
//         .where(eq(sessionUsers.studentId, studentId));

//     const directIds = directSessionIds.map(s => s.sessionId);

//     // 3. Build conditions
//     const conditions = [];
//     if (directIds.length > 0) {
//         conditions.push(inArray(sessions.id, directIds));
//     }
//     if (groupIds.length > 0) {
//         conditions.push(inArray(sessions.groupId, groupIds));
//     }

//     if (conditions.length === 0) {
//         return SuccessResponse(res, []);
//     }

//     const pastSessions = await db
//         .select({
//             id: sessions.id,
//             name: sessions.name,
//             sessionDate: sessions.sessionDate,
//             timeFrom: sessions.timeFrom,
//             timeTo: sessions.timeTo,
//             categoryName: category.name,
//             courseName: courses.name,
//             lessonName: sessions.lessonName,
//             type: sessions.type,
//             groupName: groups.name,
//             teacherName: teachers.name,
//             attendanceStatus: sessionAttendance.status,
//             attendedAt: sessionAttendance.attendedAt,
//         })
//         .from(sessions)
//         .leftJoin(category, eq(sessions.categoryId, category.id))
//         .leftJoin(courses, eq(sessions.courseId, courses.id))
//         .leftJoin(groups, eq(sessions.groupId, groups.id))
//         .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
//         .leftJoin(sessionAttendance, and(
//             eq(sessionAttendance.sessionId, sessions.id),
//             eq(sessionAttendance.studentId, studentId),
//         ))
//         .where(and(
//             lt(sessions.sessionDate, new Date(today)),
//             or(...conditions),
//         ))
//         .orderBy(sql`${sessions.sessionDate} DESC`);

//     SuccessResponse(res, pastSessions);
// };

// // ===================== JOIN SESSION (MARK ATTENDANCE) =====================
// export const joinSession = async (req: Request, res: Response) => {
//     const studentId = getStudentId(req);
//     const { sessionId } = req.params;

//     // 1. Check session exists
//     const [session] = await db
//         .select({
//             id: sessions.id,
//             sessionLink: sessions.session_link,
//             groupId: sessions.groupId,
//         })
//         .from(sessions)
//         .where(eq(sessions.id, sessionId));

//     if (!session) throw new NotFound("Session not found");

//     // 2. Check if the student belongs to this session (direct OR through group)
//     const [directMembership] = await db
//         .select({ id: sessionUsers.id })
//         .from(sessionUsers)
//         .where(and(
//             eq(sessionUsers.sessionId, sessionId),
//             eq(sessionUsers.studentId, studentId),
//         ));

//     let hasAccess = !!directMembership;

//     if (!hasAccess && session.groupId) {
//         const [groupMembership] = await db
//             .select({ id: groupStudents.id })
//             .from(groupStudents)
//             .where(and(
//                 eq(groupStudents.groupId, session.groupId),
//                 eq(groupStudents.studentId, studentId),
//             ));
//         hasAccess = !!groupMembership;
//     }

//     if (!hasAccess) {
//         throw new NotFound("You are not enrolled in this session");
//     }

//     // 3. Check if already attended (don't deduct again)
//     const [existing] = await db
//         .select({ id: sessionAttendance.id, status: sessionAttendance.status })
//         .from(sessionAttendance)
//         .where(and(
//             eq(sessionAttendance.sessionId, sessionId),
//             eq(sessionAttendance.studentId, studentId),
//         ));

//     if (existing && existing.status === "present") {
//         return SuccessResponse(res, { sessionLink: session.sessionLink });
//     }

//     // 4. Check live balance
//     const [student] = await db
//         .select({ liveBalance: Student.livebalance })
//         .from(Student)
//         .where(eq(Student.id, studentId));

//     if (!student || student.liveBalance <= 0) {
//         throw new BadRequest("Insufficient live balance");
//     }

//     // 5. Upsert attendance + deduct 1 from live balance
//     await db.transaction(async (tx) => {
//         if (existing) {
//             await tx.update(sessionAttendance)
//                 .set({ status: "present", attendedAt: new Date() })
//                 .where(eq(sessionAttendance.id, existing.id));
//         } else {
//             await tx.insert(sessionAttendance).values({
//                 sessionId,
//                 studentId,
//                 status: "present",
//                 attendedAt: new Date(),
//             });
//         }

//         await tx.update(Student)
//             .set({ livebalance: sql`${Student.livebalance} - 1` })
//             .where(eq(Student.id, studentId));
//     });

//     SuccessResponse(res, { sessionLink: session.sessionLink });
// };
