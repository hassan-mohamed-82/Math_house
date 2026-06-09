// controllers/admin.controller.ts

import { Request, Response } from "express";
import { db } from "../../models/connection";
import { parents } from "../../models/schema";
import { eq, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { Student } from "../../models/schema";

export const createParent = async (req: Request, res: Response) => {
    const { name, email, phoneNumber, password, status, studentIds } = req.body;

    if(!name || !email || !phoneNumber || !password){
        throw new BadRequest("Name, Email, Phone Number, Password are required");
    }

    const existingParent = await db
        .select()
        .from(parents)
        .where(eq(parents.email, email));

    if (existingParent.length > 0) {
        throw new BadRequest("email is already exists");
    }

    // Validate students efficiently without loops if provided
    let uniqueStudentIds: string[] = [];
    if(studentIds && Array.isArray(studentIds) && studentIds.length > 0){
        uniqueStudentIds = [...new Set(studentIds)] as string[];
        const existingStudents = await db
            .select({ id: Student.id })
            .from(Student)
            .where(inArray(Student.id, uniqueStudentIds));
        
        if(existingStudents.length !== uniqueStudentIds.length){
            throw new BadRequest("One or more students not found");
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = randomUUID();

    await db.insert(parents).values({
        id,
        name,
        email,
        phoneNumber,
        password: hashedPassword,
        status: status || "active"
    });

    // Update students in one single query
    if(uniqueStudentIds.length > 0){
        await db.update(Student).set({ parentphone: phoneNumber }).where(inArray(Student.id, uniqueStudentIds));
    }

    return SuccessResponse(res,  {message:"create parent success", data: { id }});
};

export const getAllParents = async (req: Request, res: Response) => {
    const allParents = await db
        .select({
            id: parents.id,
            name: parents.name,
            email: parents.email,
            phoneNumber: parents.phoneNumber,
            status: parents.status,
            createdAt: parents.createdAt,
            updatedAt: parents.updatedAt
        })
        .from(parents);

        SuccessResponse(res,  {message:"get all parents success", data: allParents});
};

export const getParentById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const parent = await db
        .select({
            id: parents.id,
            name: parents.name,
            email: parents.email,
            phoneNumber: parents.phoneNumber,
            status: parents.status,
            createdAt: parents.createdAt,
            updatedAt: parents.updatedAt
        })
        .from(parents)
        .where(eq(parents.id, id));

    if (parent.length === 0) {
        throw new NotFound("parent not found");
    }

    return SuccessResponse(res,  {message:"get parent by id success", data: parent[0]});
};

export const updateParent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, phoneNumber, status, oldPassword, newPassword, studentIds } = req.body;

    const existingParent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, id));

    if (existingParent.length === 0) {
        throw new NotFound("parent not found");
    }

    const currentParentPhone = existingParent[0].phoneNumber;

    if (email && email !== existingParent[0].email) {
        const emailExists = await db
            .select()
            .from(parents)
            .where(eq(parents.email, email));

        if (emailExists.length > 0) {
            throw new BadRequest("email already exists");
        }
    }

    let uniqueStudentIds: string[] = [];
    if (studentIds && Array.isArray(studentIds)) {
        uniqueStudentIds = [...new Set(studentIds)] as string[];

        if (uniqueStudentIds.length > 0) {
            // جلب الطلاب المطلوبين للتأكد من وجودهم ومن حالات ربطهم الحالية
            const studentsInDb = await db
                .select({ 
                    id: Student.id, 
                    parentphone: Student.parentphone 
                })
                .from(Student)
                .where(inArray(Student.id, uniqueStudentIds));

            // أ. التأكد من أن جميع الـ IDs المرسلة صحيحة وموجودة بالقاعدة
            if (studentsInDb.length !== uniqueStudentIds.length) {
                throw new BadRequest("One or more students not found");
            }

            // ب. الـ Validation الصارم: التأكد أن الطالب ليس ملكاً لأحد آخر
            for (const student of studentsInDb) {
                if (
                    student.parentphone && 
                    student.parentphone.trim() !== "" && 
                    student.parentphone !== currentParentPhone
                ) {
                    throw new BadRequest(`Student with ID ${student.id} is already linked to another parent`);
                }
            }
        }
    }

    const updateData: any = {
        updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (status) updateData.status = status;

    if (newPassword && oldPassword) {
        const isPasswordValid = await bcrypt.compare(oldPassword, existingParent[0].password);
        if (!isPasswordValid) {
            throw new BadRequest("old password is not correct");
        }
        updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 1) {
        throw new BadRequest("no data to update");
    }

    await db
        .update(parents)
        .set(updateData)
        .where(eq(parents.id, id));
    // نستخدم الـ phoneNumber الجديد إذا أُرسل، وإلا نعتمد الهاتف القديم لعملية الربط
    const finalParentPhone = phoneNumber || currentParentPhone;

    // أولاً: تصفير وفك ارتباط الطلاب القدامى التابعين لولي الأمر هذا (لإتاحة التحديث الكامل بالـ Array الجديدة)
    await db
        .update(Student)
        .set({ parentphone: null })
        .where(eq(Student.parentphone, currentParentPhone));

    // ثانياً: ربط مجموعة الطلاب الجديدة بولي الأمر دفعة واحدة بـ Query واحدة سريعة
    if (uniqueStudentIds.length > 0) {
        await db
            .update(Student)
            .set({ parentphone: finalParentPhone })
            .where(inArray(Student.id, uniqueStudentIds));
    }

    return SuccessResponse(res, { message: "update parent and student links success" });
};

export const deleteParent = async (req: Request, res: Response) => {
    const { id } = req.params;

    const parent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, id));

    if (parent.length === 0) {
        throw new NotFound("parent not found");
    }

    await db.delete(parents).where(eq(parents.id, id));

    SuccessResponse(res,  {message:"delete parent success"});
};

export const toggleParentStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    const parent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, id));

    if (parent.length === 0) {
        throw new NotFound("parent not found");
    }

    const newStatus = parent[0].status === "active" ? "inactive" : "active";

    await db
        .update(parents)
        .set({
            status: newStatus,
            updatedAt: new Date()
        })
        .where(eq(parents.id, id));

    return SuccessResponse(res,  {message:`toggle parent status success`});
};