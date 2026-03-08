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
import { eq, like, or, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";

// ===================== SELECT OPTIONS =====================
export const selectOptions = async (req: Request, res: Response) => {
    const [groupsList, teachersList, categoriesList, coursesList] = await Promise.all([
        db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.isActive, true)),
        db.select({ id: teachers.id, name: teachers.name }).from(teachers),
        db.select({ id: category.id, name: category.name }).from(category),
        db.select({ id: courses.id, name: courses.name, categoryId: courses.categoryId }).from(courses),
    ]);

    SuccessResponse(res, {
        groups: groupsList.map(g => ({ value: g.id, label: g.name })),
        teachers: teachersList.map(t => ({ value: t.id, label: t.name })),
        categories: categoriesList.map(c => ({ value: c.id, label: c.name })),
        courses: coursesList.map(c => ({ value: c.id, label: c.name, categoryId: c.categoryId })),
    });
};

// ===================== USERS APIs =====================
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
        session_link,
        material_link,
        teacher_material_link,
        userIds
    } = req.body;

    if (!name || !sessionDate || !timeFrom || !timeTo || !type || !teacherId) {
        throw new BadRequest("Missing required fields");
    }

    const sessionId = randomUUID();

    // استخدام Transaction لضمان سلامة البيانات
    await db.transaction(async (tx) => {
        // 1. إدخال الجلسة مع معالجة القيم الفارغة
        await tx.insert(sessions).values({
            id: sessionId,
            name,
            sessionDate,
            timeFrom,
            timeTo,
            categoryId: categoryId || null,
            courseId: courseId || null,
            lessonId: (lessonId && lessonId.trim() !== "") ? lessonId : null,
            lessonName: lessonName || null,
            type,
            groupId: type === "group" ? (groupId || null) : null,
            teacherId,
            session_link: session_link || null,
            material_link: material_link || null,
            teacher_material_link: teacher_material_link || null,
        });

        // 2. تحديد المستخدمين المستهدفين
        let finalUserIds: string[] = userIds || [];

        if (type === "group" && groupId && finalUserIds.length === 0) {
            const groupUsersList = await tx
                .select({ studentId: groupStudents.studentId })
                .from(groupStudents)
                .where(eq(groupStudents.groupId, groupId));

            finalUserIds = groupUsersList.map(u => u.studentId);
        }

        // 3. ربط المستخدمين بالجلسة
        if (finalUserIds.length > 0) {
            const sessionUserRecords = finalUserIds.map((uId: string) => ({
                sessionId: sessionId,
                studentId: uId
            }));
            await tx.insert(sessionUsers).values(sessionUserRecords);
        }
    });

    SuccessResponse(res, { id: sessionId }, 201);
};

export const getAllSessions = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, date, type, teacherId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];

    if (date) conditions.push(eq(sessions.sessionDate, new Date(date as string)));
    if (type) conditions.push(eq(sessions.type, type as any));
    if (teacherId) conditions.push(eq(sessions.teacherId, teacherId as string));

    const sessionsList = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            categoryName: category.name,
            courseName: courses.name,
            lessonName: sessions.lessonName,
            type: sessions.type,
            groupName: groups.name,
            teacherName: teachers.name,
            session_link: sessions.session_link,
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
            courseId: sessions.courseId,
            lessonId: sessions.lessonId,
            lessonName: sessions.lessonName,
            type: sessions.type,
            groupId: sessions.groupId,
            teacherId: sessions.teacherId,
            session_link: sessions.session_link,
            material_link: sessions.material_link,
            teacher_material_link: sessions.teacher_material_link,
        })
        .from(sessions)
        .where(eq(sessions.id, id));

    if (!session) throw new NotFound("Session not found");

    const users = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
        })
        .from(sessionUsers)
        .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
        .where(eq(sessionUsers.sessionId, id));

    SuccessResponse(res, {
        ...session,
        users: users.map(u => ({ value: u.id, label: `${u.firstname} ${u.lastname}` }))
    });
};

export const updateSession = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userIds, ...data } = req.body;

    await db.transaction(async (tx) => {
        await tx.update(sessions)
            .set({
                ...data,
                lessonId: data.lessonId || null,
                updatedAt: new Date()
            })
            .where(eq(sessions.id, id));

        if (userIds !== undefined) {
            await tx.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));
            if (userIds.length > 0) {
                const records = userIds.map((uId: string) => ({ sessionId: id, studentId: uId }));
                await tx.insert(sessionUsers).values(records);
            }
        }
    });

    SuccessResponse(res, { message: "Session updated successfully" });
};

export const deleteSession = async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.transaction(async (tx) => {
        await tx.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));
        await tx.delete(sessions).where(eq(sessions.id, id));
    });
    SuccessResponse(res, { message: "Session deleted successfully" });
};