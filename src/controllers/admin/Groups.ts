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
    const { q = "", page = 1, limit = 20 } = req.query;
    const searchTerm = `%${q}%`;
    const offset = (Number(page) - 1) * Number(limit);

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
        .limit(Number(limit))
        .offset(offset);

    // Get total count for pagination metadata
    const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(Student)
        .where(
            or(
                like(Student.firstname, searchTerm),
                like(Student.lastname, searchTerm),
                like(Student.nickname, searchTerm),
                like(Student.email, searchTerm),
                like(Student.phone, searchTerm)
            )
        );

    SuccessResponse(res, {
        data: students.map(s => ({
            value: s.id,
            label: `${s.firstname} ${s.lastname}`,
            nickname: s.nickname,
            email: s.email
        })),
        pagination: {
            total: Number(total),
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(Number(total) / Number(limit))
        }
    });

};

// ===================== GROUPS CRUD =====================

// إنشاء Group جديد
export const createGroup = async (req: Request, res: Response) => {
    const { name, studentIds, isActive = true } = req.body;

    // Validation
    if (!name) {
        throw new BadRequest("name is required");
    }

    const groupId = randomUUID();

    // إنشاء الـ Group
    await db.insert(groups).values({
        id: groupId,
        name,
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
            isActive: groups.isActive,
            createdAt: groups.createdAt,
        })
        .from(groups)
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
            isActive: groups.isActive,
        })
        .from(groups)
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
        students
    });

};

// تحديث Group
export const updateGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, studentIds, isActive } = req.body;

    // تحديث الـ Group
    await db.update(groups)
        .set({
            name,
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