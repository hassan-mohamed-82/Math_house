// controllers/sessions.controller.ts
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { sessions, sessionUsers } from "../../models/schema/admin/Session";
import { groups, groupStudents } from "../../models/schema/admin/Groups";
import { Student } from "../../models/schema/admin/Student";
import { teachers } from "../../models/schema/admin/teacher";
import { category } from "../../models/schema/admin/category";
import { courses } from "../../models/schema/admin/courses";
import { lessons } from "../../models/schema/admin/lessons";
import { eq, like, or, sql, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";


// ===================== SELECT OPTIONS =====================

// جلب Groups و Teachers للـ Select dropdowns
export const selectOptions = async (req: Request, res: Response) => {
    const [groupsList, teachersList] = await Promise.all([
        db.select({
            id: groups.id,
            name: groups.name,
        }).from(groups).where(eq(groups.isActive, true)),
        db.select({
            id: teachers.id,
            name: teachers.name,
        }).from(teachers),
    ]);

    SuccessResponse(res, {
        groups: groupsList.map(g => ({
            value: g.id,
            label: g.name
        })),
        teachers: teachersList.map(t => ({
            value: t.id,
            label: t.name
        })),
    });
};


// ===================== USERS APIs =====================

// جلب الـ Users اللي في Group معين (لما تختار Group)
export const getGroupUsers = async (req: Request, res: Response) => {
    const { groupId } = req.params;

    const users = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
        })
        .from(groupStudents)
        .innerJoin(Student, eq(groupStudents.studentId, Student.id))
        .where(eq(groupStudents.groupId, groupId));

    SuccessResponse(res, users.map(u => ({
        value: u.id,
        label: `${u.firstname} ${u.lastname}`,
        nickname: u.nickname,
        email: u.email,
        phone: u.phone
    })));
};

export const searchUsers = async (req: Request, res: Response) => {
    const { q, excludeIds } = req.query;

    const searchValue = (q ?? "").toString().trim().toLowerCase();
    const searchTerm = `%${searchValue}%`;

    let excludeIdsList: string[] = [];
    if (excludeIds && typeof excludeIds === "string" && excludeIds.trim() !== "") {
        excludeIdsList = excludeIds.split(",");
    }

    let users = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
        })
        .from(Student)
        .where(
            or(
                like(Student.firstname, searchTerm),
                like(Student.lastname, searchTerm),
                like(Student.nickname, searchTerm),
                like(Student.email, searchTerm),
                like(Student.phone, searchTerm)
            )
        )
        .limit(20);

    if (excludeIdsList.length > 0) {
        users = users.filter(u => !excludeIdsList.includes(u.id));
    }

    SuccessResponse(res, users.map(u => ({
        value: u.id,
        label: `${u.firstname} ${u.lastname}`,
        nickname: u.nickname,
        email: u.email
    })));
};

// ===================== SESSIONS CRUD =====================

// إنشاء Session جديدة
export const createSession = async (req: Request, res: Response) => {
    const {
        name,
        sessionDate,
        timeFrom,
        timeTo,
        categoryId,
        courseId,
        lessonId,
        lessonName,
        type,
        groupId,
        teacherId,
        userIds
    } = req.body;

    if (!name || !sessionDate || !timeFrom || !timeTo || !categoryId || !courseId || !type || !teacherId) {
        throw new BadRequest("Missing required fields");
    }

    const sessionId = randomUUID();

    await db.insert(sessions).values({
        id: sessionId,
        name,
        sessionDate,
        timeFrom,
        timeTo,
        categoryId,
        courseId,
        lessonId,
        lessonName,
        type,
        groupId: type === "group" ? groupId : null,
        teacherId
    });

    let finalUserIds: string[] = userIds || [];

    // لو Type = group و مفيش userIds، نجيب Users الـ Group تلقائياً
    if (type === "group" && groupId && (!userIds || userIds.length === 0)) {
        const groupUsers = await db
            .select({ studentId: groupStudents.studentId })
            .from(groupStudents)
            .where(eq(groupStudents.groupId, groupId));

        finalUserIds = groupUsers.map(u => u.studentId);
    }

    if (finalUserIds.length > 0) {
        const sessionUserRecords = finalUserIds.map((userId: string) => ({
            sessionId: sessionId,
            studentId: userId
        }));

        await db.insert(sessionUsers).values(sessionUserRecords);
    }

    SuccessResponse(res, { id: sessionId }, 201);
};

// جلب كل الـ Sessions مع Filter
export const getAllSessions = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, date, type, teacherId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const conditions = [];

    if (date) {
        conditions.push(eq(sessions.sessionDate, new Date(date as string)));
    }
    if (type) {
        conditions.push(eq(sessions.type, type as "session" | "private" | "group"));
    }
    if (teacherId) {
        conditions.push(eq(sessions.teacherId, teacherId as string));
    }

    const sessionsList = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            categoryId: sessions.categoryId,
            categoryName: category.name,
            courseId: sessions.courseId,
            courseName: courses.name,
            lessonName: sessions.lessonName,
            type: sessions.type,
            groupId: sessions.groupId,
            groupName: groups.name,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
        })
        .from(sessions)
        .leftJoin(category, eq(sessions.categoryId, category.id))
        .leftJoin(courses, eq(sessions.courseId, courses.id))
        .leftJoin(groups, eq(sessions.groupId, groups.id))
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sessions.sessionDate)
        .limit(Number(limit))
        .offset(offset);

    SuccessResponse(res, sessionsList);
};

// جلب Session واحدة بالـ ID (مع الـ Users)
export const getSessionById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [session] = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            categoryId: sessions.categoryId,
            categoryName: category.name,
            courseId: sessions.courseId,
            courseName: courses.name,
            lessonName: sessions.lessonName,
            type: sessions.type,
            groupId: sessions.groupId,
            groupName: groups.name,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
        })
        .from(sessions)
        .leftJoin(category, eq(sessions.categoryId, category.id))
        .leftJoin(courses, eq(sessions.courseId, courses.id))
        .leftJoin(groups, eq(sessions.groupId, groups.id))
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(eq(sessions.id, id));

    if (!session) {
        throw new NotFound("Session not found");
    }

    // جلب الـ Users
    const users = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
        })
        .from(sessionUsers)
        .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
        .where(eq(sessionUsers.sessionId, id));

    SuccessResponse(res, {
        ...session,
        users: users.map(u => ({
            value: u.id,
            label: `${u.firstname} ${u.lastname}`,
            nickname: u.nickname,
            email: u.email
        }))
    });
};

// تحديث Session (مع الـ Users)
export const updateSession = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        name,
        sessionDate,
        timeFrom,
        timeTo,
        categoryId,
        courseId,
        lessonId,
        lessonName,
        type,
        groupId,
        teacherId,
        userIds
    } = req.body;

    await db.update(sessions)
        .set({
            name,
            sessionDate,
            timeFrom,
            timeTo,
            categoryId,
            courseId,
            lessonId,
            lessonName,
            type,
            groupId: type === "group" ? groupId : null,
            teacherId,
            updatedAt: new Date()
        })
        .where(eq(sessions.id, id));

    // تحديث الـ Users
    if (userIds !== undefined) {
        await db.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));

        if (userIds.length > 0) {
            const sessionUserRecords = userIds.map((userId: string) => ({
                sessionId: id,
                studentId: userId
            }));

            await db.insert(sessionUsers).values(sessionUserRecords);
        }
    }

    SuccessResponse(res, { message: "Session updated successfully" });
};

// حذف Session
export const deleteSession = async (req: Request, res: Response) => {
    const { id } = req.params;

    await db.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));
    await db.delete(sessions).where(eq(sessions.id, id));

    SuccessResponse(res, { message: "Session deleted successfully" });
};