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

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedLessonId = typeof lessonId === "string" ? lessonId.trim() : "";
    const trimmedLessonName = typeof lessonName === "string" ? lessonName.trim() : "";
    const trimmedGroupId = typeof groupId === "string" ? groupId.trim() : "";
    const trimmedSessionLink = typeof session_link === "string" ? session_link.trim() : "";
    const trimmedMaterialLink = typeof material_link === "string" ? material_link.trim() : "";
    const trimmedTeacherMaterialLink = typeof teacher_material_link === "string" ? teacher_material_link.trim() : "";

    // Validation for NOT NULL fields
    if (!trimmedName || !sessionDate || !timeFrom || !timeTo || !type || !teacherId || !categoryId || !courseId || !trimmedSessionLink) {
        throw new BadRequest("Missing required fields (Check categoryId, courseId, or session_link)");
    }

    if (!["session", "private", "group"].includes(type)) {
        throw new BadRequest("Invalid session type");
    }

    if (type === "group" && !trimmedGroupId) {
        throw new BadRequest("groupId is required for group sessions");
    }

    if (userIds !== undefined && !Array.isArray(userIds)) {
        throw new BadRequest("userIds must be an array of student ids");
    }

    const parsedSessionDate = new Date(sessionDate);
    if (Number.isNaN(parsedSessionDate.getTime())) {
        throw new BadRequest("Invalid sessionDate");
    }

    const [existingCategory, existingCourse, existingTeacher, existingGroup, existingLesson] = await Promise.all([
        db.select({ id: category.id }).from(category).where(eq(category.id, categoryId)).limit(1),
        db.select({ id: courses.id, categoryId: courses.categoryId }).from(courses).where(eq(courses.id, courseId)).limit(1),
        db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, teacherId)).limit(1),
        type === "group" && trimmedGroupId
            ? db.select({ id: groups.id }).from(groups).where(eq(groups.id, trimmedGroupId)).limit(1)
            : Promise.resolve([]),
        trimmedLessonId
            ? db.select({ id: lessons.id, categoryId: lessons.categoryId, courseId: lessons.courseId }).from(lessons).where(eq(lessons.id, trimmedLessonId)).limit(1)
            : Promise.resolve([]),
    ]);

    if (existingCategory.length === 0) {
        throw new BadRequest("Category not found");
    }

    if (existingCourse.length === 0) {
        throw new BadRequest("Course not found");
    }

    if (existingCourse[0].categoryId !== categoryId) {
        throw new BadRequest("The selected course does not belong to the selected category");
    }

    if (existingTeacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }

    if (type === "group" && existingGroup.length === 0) {
        throw new BadRequest("Group not found");
    }

    if (trimmedLessonId && existingLesson.length === 0) {
        throw new BadRequest("Lesson not found");
    }

    if (trimmedLessonId && existingLesson.length > 0) {
        if (existingLesson[0].categoryId !== categoryId) {
            throw new BadRequest("The selected lesson does not belong to the selected category");
        }

        if (existingLesson[0].courseId !== courseId) {
            throw new BadRequest("The selected lesson does not belong to the selected course");
        }
    }

    const sessionId = randomUUID();

    await db.transaction(async (tx) => {
        // 1. إنشاء الـ Object الأساسي بالحقول الإجبارية فقط
        const newSessionData: any = {
            id: sessionId,
            name: trimmedName,
            sessionDate: parsedSessionDate.toISOString().split('T')[0],
            timeFrom,
            timeTo,
            categoryId,
            courseId,
            type,
            teacherId,
            session_link: trimmedSessionLink,
        };

        // 2. حقن الحقول الاختيارية ديناميكياً فقط في حال وجودها وكانت غير فارغة
        if (trimmedLessonId) newSessionData.lessonId = trimmedLessonId;
        if (trimmedLessonName) newSessionData.lessonName = trimmedLessonName;
        if (type === "group" && trimmedGroupId) newSessionData.groupId = trimmedGroupId;
        if (trimmedMaterialLink) newSessionData.material_link = trimmedMaterialLink;
        if (trimmedTeacherMaterialLink) newSessionData.teacher_material_link = trimmedTeacherMaterialLink;

        // 3. التنفيذ
        await tx.insert(sessions).values(newSessionData);

        let finalUserIds: string[] = userIds || [];

        if (type === "group" && trimmedGroupId && finalUserIds.length === 0) {
            const groupUsersList = await tx
                .select({ studentId: groupStudents.studentId })
                .from(groupStudents)
            .where(eq(groupStudents.groupId, trimmedGroupId));

            finalUserIds = groupUsersList.map(u => u.studentId);
        }

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
        // تجهيز بيانات التحديث
        const updateData: any = { ...data, updatedAt: new Date() };

        // تنظيف البيانات: إذا تم إرسال حقول اختيارية فارغة، نقوم بحذفها من الكائن
        // لمنع Drizzle من محاولة إدخال قيمة فارغة في حقول لا تقبلها
        if (updateData.lessonId !== undefined && updateData.lessonId.trim() === "") delete updateData.lessonId;
        if (updateData.lessonName !== undefined && updateData.lessonName.trim() === "") delete updateData.lessonName;
        if (updateData.groupId !== undefined && updateData.groupId.trim() === "") delete updateData.groupId;
        if (updateData.material_link !== undefined && updateData.material_link.trim() === "") delete updateData.material_link;
        if (updateData.teacher_material_link !== undefined && updateData.teacher_material_link.trim() === "") delete updateData.teacher_material_link;

        await tx.update(sessions)
            .set(updateData)
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