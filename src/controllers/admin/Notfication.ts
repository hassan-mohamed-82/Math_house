// controllers/notifications.controller.ts
import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    notifications,
    notificationParents,
    notificationStudents,
    notificationTeachers
} from "../../models/schema/admin/Notfication";
import { Student } from "../../models/schema/admin/Student";
import { teachers } from "../../models/schema/admin/teacher";
import { parents } from "../../models/schema/admin/parent";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";


// ===================== FILE UPLOAD HELPER =====================

const saveUploadedFile = async (req: Request, file: Express.Multer.File): Promise<string> => {
    const ext = path.extname(file.originalname) || '.bin';
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const rootDir = path.resolve(__dirname, "../../");
    const uploadsDir = path.join(rootDir, "uploads", "notifications");

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, fileName), file.buffer);

    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    return `${protocol}://${req.get("host")}/uploads/notifications/${fileName}`;
};

// ===================== SELECT OPTIONS =====================

export const selectOptions = async (req: Request, res: Response) => {
    const [parentsList, studentsList, teachersList] = await Promise.all([
        db.select({
            id: parents.id,
            name: parents.name,
            phoneNumber: parents.phoneNumber,
        }).from(parents),
        db.select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
        }).from(Student),
        db.select({
            id: teachers.id,
            name: teachers.name,
        }).from(teachers),
    ]);

    SuccessResponse(res, {
        parents: parentsList.map(p => ({
            value: p.id,
            label: p.name,
            phone: p.phoneNumber
        })),
        students: studentsList.map(s => ({
            value: s.id,
            label: `${s.firstname} ${s.lastname} (${s.nickname})`
        })),
        teachers: teachersList.map(t => ({
            value: t.id,
            label: t.name
        })),
    });
};

// البحث في الـ Parents
export const searchParents = async (req: Request, res: Response) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;

    const parentsList = await db
        .select({
            id: parents.id,
            name: parents.name,
            phoneNumber: parents.phoneNumber,
        })
        .from(parents)
        .where(
            or(
                like(parents.name, searchTerm),
                like(parents.phoneNumber, searchTerm)
            )
        )
        .limit(20);

    SuccessResponse(res, parentsList.map(p => ({
        value: p.id,
        label: p.name,
        phone: p.phoneNumber
    })));
};

// البحث في الـ Students
export const searchStudents = async (req: Request, res: Response) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;

    const studentsList = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
        })
        .from(Student)
        .where(
            or(
                like(Student.firstname, searchTerm),
                like(Student.lastname, searchTerm),
                like(Student.nickname, searchTerm)
            )
        )
        .limit(20);

    SuccessResponse(res, studentsList.map(s => ({
        value: s.id,
        label: `${s.firstname} ${s.lastname} (${s.nickname})`
    })));
};

// البحث في الـ Teachers
export const searchTeachers = async (req: Request, res: Response) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;

    const teachersList = await db
        .select({
            id: teachers.id,
            name: teachers.name,
        })
        .from(teachers)
        .where(like(teachers.name, searchTerm))
        .limit(20);

    SuccessResponse(res, teachersList.map(t => ({
        value: t.id,
        label: t.name
    })));
};


// ===================== NOTIFICATIONS CRUD =====================

export const createNotification = async (req: Request, res: Response) => {
    const {
        materialLink,
        dateTime,
        notification,
        sendToAll,
        parentIds,      // Array of parent IDs
        studentIds,     // Array of student IDs
        teacherIds      // Array of teacher IDs
    } = req.body;

    // Handle file upload
    const materialFile = req.file ? await saveUploadedFile(req, req.file) : null;

    if (!dateTime || !notification) {
        throw new BadRequest("Date time and notification are required");
    }

    // لازم يختار حد أو يبعت للكل
    if (!sendToAll &&
        (!parentIds || parentIds.length === 0) &&
        (!studentIds || studentIds.length === 0) &&
        (!teacherIds || teacherIds.length === 0)) {
        throw new BadRequest("Please select at least one recipient or send to all");
    }

    const notificationId = uuidv4();

    // إنشاء الـ Notification
    await db.insert(notifications).values({
        id: notificationId,
        materialLink,
        materialFile,
        dateTime: new Date(dateTime),
        notification,
        sendToAll: sendToAll || false
    });

    // لو sendToAll = true، نضيف كل الـ Parents و Students و Teachers
    if (sendToAll) {
        // جلب كل الـ Parents
        const allParents = await db.select({ id: parents.id }).from(parents);
        if (allParents.length > 0) {
            await db.insert(notificationParents).values(
                allParents.map(p => ({
                    notificationId,
                    parentId: p.id
                }))
            );
        }

        // جلب كل الـ Students
        const allStudents = await db.select({ id: Student.id }).from(Student);
        if (allStudents.length > 0) {
            await db.insert(notificationStudents).values(
                allStudents.map(s => ({
                    notificationId,
                    studentId: s.id
                }))
            );
        }

        // جلب كل الـ Teachers
        const allTeachers = await db.select({ id: teachers.id }).from(teachers);
        if (allTeachers.length > 0) {
            await db.insert(notificationTeachers).values(
                allTeachers.map(t => ({
                    notificationId,
                    teacherId: t.id
                }))
            );
        }
    } else {
        // إضافة الـ Parents المحددين
        if (parentIds && parentIds.length > 0) {
            await db.insert(notificationParents).values(
                parentIds.map((parentId: string) => ({
                    notificationId,
                    parentId
                }))
            );
        }

        // إضافة الـ Students المحددين
        if (studentIds && studentIds.length > 0) {
            await db.insert(notificationStudents).values(
                studentIds.map((studentId: string) => ({
                    notificationId,
                    studentId
                }))
            );
        }

        // إضافة الـ Teachers المحددين
        if (teacherIds && teacherIds.length > 0) {
            await db.insert(notificationTeachers).values(
                teacherIds.map((teacherId: string) => ({
                    notificationId,
                    teacherId
                }))
            );
        }
    }

    SuccessResponse(res, { id: notificationId }, 201);
};

export const getAllNotifications = async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const notificationsList = await db
        .select({
            id: notifications.id,
            materialLink: notifications.materialLink,
            materialFile: notifications.materialFile,
            dateTime: notifications.dateTime,
            notification: notifications.notification,
            sendToAll: notifications.sendToAll,
            createdAt: notifications.createdAt,
        })
        .from(notifications)
        .orderBy(desc(notifications.createdAt))
        .limit(Number(limit))
        .offset(offset);

    // Format time
    const formattedNotifications = notificationsList.map(n => ({
        ...n,
        time: n.dateTime ? new Date(n.dateTime).toLocaleTimeString('en-US', { hour12: false }) : '00:00:00',
        text: n.notification.substring(0, 50) + (n.notification.length > 50 ? '...' : '')
    }));

    SuccessResponse(res, formattedNotifications);
};

export const getNotificationById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [notification] = await db
        .select()
        .from(notifications)
        .where(eq(notifications.id, id));

    if (!notification) {
        throw new NotFound("Notification not found");
    }

    // جلب الـ Parents
    const notifParents = await db
        .select({
            id: parents.id,
            name: parents.name,
        })
        .from(notificationParents)
        .innerJoin(parents, eq(notificationParents.parentId, parents.id))
        .where(eq(notificationParents.notificationId, id));

    // جلب الـ Students
    const notifStudents = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
        })
        .from(notificationStudents)
        .innerJoin(Student, eq(notificationStudents.studentId, Student.id))
        .where(eq(notificationStudents.notificationId, id));

    // جلب الـ Teachers
    const notifTeachers = await db
        .select({
            id: teachers.id,
            name: teachers.name,
        })
        .from(notificationTeachers)
        .innerJoin(teachers, eq(notificationTeachers.teacherId, teachers.id))
        .where(eq(notificationTeachers.notificationId, id));

    SuccessResponse(res, {
        ...notification,
        parents: notifParents.map(p => ({
            value: p.id,
            label: p.name
        })),
        students: notifStudents.map(s => ({
            value: s.id,
            label: `${s.firstname} ${s.lastname} (${s.nickname})`
        })),
        teachers: notifTeachers.map(t => ({
            value: t.id,
            label: t.name
        }))
    });
};

export const updateNotification = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        materialLink,
        dateTime,
        notification,
        sendToAll,
        parentIds,
        studentIds,
        teacherIds
    } = req.body;

    const materialFile = req.file ? await saveUploadedFile(req, req.file) : undefined;

    // تحديث الـ Notification
    const updateData: any = {
        materialLink,
        dateTime: new Date(dateTime),
        notification,
        sendToAll: sendToAll || false,
        updatedAt: new Date()
    };

    if (materialFile) {
        updateData.materialFile = materialFile;
    }

    await db.update(notifications)
        .set(updateData)
        .where(eq(notifications.id, id));

    // حذف الـ Recipients القدام
    await db.delete(notificationParents).where(eq(notificationParents.notificationId, id));
    await db.delete(notificationStudents).where(eq(notificationStudents.notificationId, id));
    await db.delete(notificationTeachers).where(eq(notificationTeachers.notificationId, id));

    // إضافة الـ Recipients الجدد
    if (sendToAll) {
        const allParents = await db.select({ id: parents.id }).from(parents);
        if (allParents.length > 0) {
            await db.insert(notificationParents).values(
                allParents.map(p => ({ notificationId: id, parentId: p.id }))
            );
        }

        const allStudents = await db.select({ id: Student.id }).from(Student);
        if (allStudents.length > 0) {
            await db.insert(notificationStudents).values(
                allStudents.map(s => ({ notificationId: id, studentId: s.id }))
            );
        }

        const allTeachers = await db.select({ id: teachers.id }).from(teachers);
        if (allTeachers.length > 0) {
            await db.insert(notificationTeachers).values(
                allTeachers.map(t => ({ notificationId: id, teacherId: t.id }))
            );
        }
    } else {
        if (parentIds && parentIds.length > 0) {
            await db.insert(notificationParents).values(
                parentIds.map((parentId: string) => ({ notificationId: id, parentId }))
            );
        }

        if (studentIds && studentIds.length > 0) {
            await db.insert(notificationStudents).values(
                studentIds.map((studentId: string) => ({ notificationId: id, studentId }))
            );
        }

        if (teacherIds && teacherIds.length > 0) {
            await db.insert(notificationTeachers).values(
                teacherIds.map((teacherId: string) => ({ notificationId: id, teacherId }))
            );
        }
    }

    SuccessResponse(res, { message: "Notification updated successfully" });
};

export const deleteNotification = async (req: Request, res: Response) => {
    const { id } = req.params;

    // حذف الـ Recipients أولاً
    await db.delete(notificationParents).where(eq(notificationParents.notificationId, id));
    await db.delete(notificationStudents).where(eq(notificationStudents.notificationId, id));
    await db.delete(notificationTeachers).where(eq(notificationTeachers.notificationId, id));

    // حذف الـ Notification
    await db.delete(notifications).where(eq(notifications.id, id));

    SuccessResponse(res, { message: "Notification deleted successfully" });
};