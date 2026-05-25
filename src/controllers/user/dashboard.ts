import { Request, Response } from "express";
import { eq, and, gte, or, sql, inArray } from "drizzle-orm";
import { db } from "../../models/connection";
import { Student } from "../../models/schema/admin/Student";
import { sessions, sessionLessons, sessionUsers, groupStudents, sessionGroups } from "../../models/schema";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError } from "../../Errors";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

const upcomingSessionsCount = async (studentId: string): Promise<number> => {
    const today = new Date().toISOString().split("T")[0];
    const count = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${sessions.id})` })
        .from(sessions)
        .where(and(
            gte(sessions.sessionDate, new Date(today)),
            or(
                inArray(sessions.id, db.select({ sessionId: sessionUsers.sessionId }).from(sessionUsers).where(eq(sessionUsers.studentId, studentId))),
                inArray(sessions.id, db.select({ sessionId: sessionGroups.sessionId }).from(sessionGroups).where(inArray(sessionGroups.groupId, db.select({ groupId: groupStudents.groupId }).from(groupStudents).where(eq(groupStudents.studentId, studentId)))))
            )
        ));
    return Number(count[0].count) || 0;
}

export const getDashboardData = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);

    const existingStudent = await db.select().from(Student).where(eq(Student.id, studentId));
    if (existingStudent.length === 0) {
        throw new NotFound("Student not found");
    }

    const dashboardData = {
        upcomingSessionsCount: await upcomingSessionsCount(studentId),
    };

    return SuccessResponse(res, dashboardData);

};