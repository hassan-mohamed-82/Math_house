// controllers/groups.controller.ts
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { groups, groupStudents } from "../../models/schema/admin/Groups";
import { Student } from "../../models/schema/admin/Student";
import { teachers } from "../../models/schema/admin/teacher";
import { eq, like, or, sql, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";

// ===================== SELECT APIs للـ Dropdowns =====================

// جلب Students و Teachers للـ Select dropdowns
export const selectOptions = async (req: Request, res: Response) => {
    const [students, teachersList] = await Promise.all([
        db.select({
            id: Student.id,
            name: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`,
            nickname: Student.nickname,
        }).from(Student),
        db.select({
            id: teachers.id,
            name: teachers.name,
        }).from(teachers),
    ]);

    SuccessResponse(res, {
        students: students.map(s => ({
            value: s.id,
            label: s.name,
            nickname: s.nickname
        })),
        teachers: teachersList.map(t => ({
            value: t.id,
            label: t.name
        })),
    });
};

// ===================== SEARCH API =====================

// البحث في الـ Students
export const searchStudents = async (req: Request, res: Response) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;

    const students = await db
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

    SuccessResponse(res, students.map(s => ({
        value: s.id,
        label: `${s.firstname} ${s.lastname}`,
        nickname: s.nickname,
        email: s.email
    })));

};

// ===================== GROUPS CRUD =====================

// إنشاء Group جديد
export const createGroup = async (req: Request, res: Response) => {
    const { name, teacherId, days, timeFrom, timeTo, studentIds, isActive = true } = req.body;

    // Validation
    if (!name || !teacherId || !days || !timeFrom || !timeTo) {
        throw new BadRequest("Missing required fields");
    }

    const groupId = randomUUID();

    // إنشاء الـ Group
    await db.insert(groups).values({
        id: groupId,
        name,
        teacherId,
        days: days, // ["Sun", "Mon", etc.]
        timeFrom,
        timeTo,
        isActive
    });

    // إضافة الـ Students للـ Group
    if (studentIds && studentIds.length > 0) {
        const groupStudentRecords = studentIds.map((studentId: string) => ({
            groupId: groupId,
            studentId
        }));

        await db.insert(groupStudents).values(groupStudentRecords);
    }

    SuccessResponse(res, { id: groupId }, 201);

};

// جلب كل الـ Groups
export const getAllGroups = async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const groupsList = await db
        .select({
            id: groups.id,
            name: groups.name,
            teacherId: groups.teacherId,
            teacherName: teachers.name,
            days: groups.days,
            timeFrom: groups.timeFrom,
            timeTo: groups.timeTo,
            isActive: groups.isActive,
            createdAt: groups.createdAt,
        })
        .from(groups)
        .leftJoin(teachers, eq(groups.teacherId, teachers.id))
        .limit(Number(limit))
        .offset(offset);

    // جلب الـ Students لكل Group ومراعاة نوع الـ days
    const groupsWithStudents = await Promise.all(
        groupsList.map(async (group) => {
            const students = await db
                .select({
                    id: Student.id,
                    name: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`,
                })
                .from(groupStudents)
                .innerJoin(Student, eq(groupStudents.studentId, Student.id))
                .where(eq(groupStudents.groupId, group.id));

            return {
                ...group,
                days: typeof group.days === "string" ? JSON.parse(group.days) : group.days,
                students
            };
        })
    );

    SuccessResponse(res, groupsWithStudents);

};

// جلب Group واحد بالـ ID
export const getGroupById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [group] = await db
        .select({
            id: groups.id,
            name: groups.name,
            teacherId: groups.teacherId,
            teacherName: teachers.name,
            days: groups.days,
            timeFrom: groups.timeFrom,
            timeTo: groups.timeTo,
            isActive: groups.isActive,
        })
        .from(groups)
        .leftJoin(teachers, eq(groups.teacherId, teachers.id))
        .where(eq(groups.id, id));

    if (!group) {
        throw new NotFound("Group not found");
    }

    // جلب الـ Students
    const students = await db
        .select({
            id: Student.id,
            name: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`,
            nickname: Student.nickname,
        })
        .from(groupStudents)
        .innerJoin(Student, eq(groupStudents.studentId, Student.id))
        .where(eq(groupStudents.groupId, id));

    SuccessResponse(res, {
        ...group,
        days: typeof group.days === "string" ? JSON.parse(group.days as string) : group.days,
        students
    });

};

// تحديث Group
export const updateGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, teacherId, days, timeFrom, timeTo, studentIds, isActive } = req.body;

    // تحديث الـ Group
    await db.update(groups)
        .set({
            name,
            teacherId,
            days,
            timeFrom,
            timeTo,
            isActive,
            updatedAt: new Date()
        })
        .where(eq(groups.id, id));

    // تحديث الـ Students إذا تم إرسالهم
    if (studentIds !== undefined) {
        // حذف الـ Students القديمين
        await db.delete(groupStudents).where(eq(groupStudents.groupId, id));

        // إضافة الـ Students الجدد
        if (studentIds.length > 0) {
            const groupStudentRecords = studentIds.map((studentId: string) => ({
                groupId: id,
                studentId
            }));

            await db.insert(groupStudents).values(groupStudentRecords);
        }
    }

    SuccessResponse(res, { message: "Group updated successfully" });

};

// حذف Group
export const deleteGroup = async (req: Request, res: Response) => {
    const { id } = req.params;

    // حذف الـ Students من الـ Group أولاً
    await db.delete(groupStudents).where(eq(groupStudents.groupId, id));

    // حذف الـ Group
    await db.delete(groups).where(eq(groups.id, id));

    SuccessResponse(res, { message: "Group deleted successfully" });

};