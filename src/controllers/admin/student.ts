import { Request, Response } from "express";
import { db } from "../../models/connection";
import { Student } from "../../models/schema";
import { eq } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export const createStudent = async (req: Request, res: Response) => {
    const {
        firstname,
        lastname,
        nickname,
        email,
        password,
        phone,
        category,
        grade,
        parentphone
    } = req.body;

    if (!firstname || !lastname || !nickname || !email || !password || !phone || !category || !grade || !parentphone) {
        throw new BadRequest("جميع الحقول مطلوبة");
    }

    const existingStudent = await db
        .select()
        .from(Student)
        .where(eq(Student.email, email));

    if (existingStudent.length > 0) {
        throw new BadRequest("البريد الإلكتروني مستخدم بالفعل");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await db.insert(Student).values({
        id,
        firstname,
        lastname,
        nickname,
        email,
        password: hashedPassword,
        phone,
        category,
        grade,
        parentphone
    });

    SuccessResponse(res,{message:"تم إنشاء الطالب بنجاح",data:{id}});
};

export const getAllStudents = async (req: Request, res: Response) => {
    const students = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: Student.grade,
            parentphone: Student.parentphone
        })
        .from(Student);

    SuccessResponse(res,{message:"تم جلب جميع الطلاب",data:students});
};

export const getStudentById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("معرف الطالب مطلوب");
    }

    const student = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: Student.grade,
            parentphone: Student.parentphone
        })
        .from(Student)
        .where(eq(Student.id, id));

    if (student.length === 0) {
        throw new NotFound("الطالب غير موجود");
    }

    SuccessResponse(res,{message:"تم جلب الطالب",data:student[0]});
};

export const updateStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        firstname,
        lastname,
        nickname,
        email,
        phone,
        category,
        grade,
        parentphone,
        oldPassword,
        newPassword
    } = req.body;

    if (!id) {
        throw new BadRequest("معرف الطالب مطلوب");
    }

    const existingStudent = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (existingStudent.length === 0) {
        throw new NotFound("الطالب غير موجود");
    }

    if (email && email !== existingStudent[0].email) {
        const emailExists = await db
            .select()
            .from(Student)
            .where(eq(Student.email, email));

        if (emailExists.length > 0) {
            throw new BadRequest("البريد الإلكتروني مستخدم بالفعل");
        }
    }

    const updateData: any = {};

    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (nickname) updateData.nickname = nickname;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (category) updateData.category = category;
    if (grade) updateData.grade = grade;
    if (parentphone) updateData.parentphone = parentphone;

    if (newPassword) {
        if (!oldPassword) {
            throw new BadRequest("كلمة المرور القديمة مطلوبة لتغيير كلمة المرور");
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, existingStudent[0].password);

        if (!isPasswordValid) {
            throw new BadRequest("كلمة المرور القديمة غير صحيحة");
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
        throw new BadRequest("لا توجد بيانات للتحديث");
    }

    await db
        .update(Student)
        .set(updateData)
        .where(eq(Student.id, id));
     
        SuccessResponse(res,{message:"تم تحديث بيانات الطالب بنجاح",data:updateData});
};

export const deleteStudent = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("معرف الطالب مطلوب");
    }

    const student = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (student.length === 0) {
        throw new NotFound("الطالب غير موجود");
    }

    await db.delete(Student).where(eq(Student.id, id));

    SuccessResponse(res,{message:"تم حذف الطالب بنجاح"});
};

export const getStudentsByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    if (!categoryId) {
        throw new BadRequest("معرف الفئة مطلوب");
    }

    const students = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: Student.grade,
            parentphone: Student.parentphone
        })
        .from(Student)
        .where(eq(Student.category, categoryId));

    SuccessResponse(res,{message:"تم جلب الطلاب",data:students});
};

export const getStudentsByGrade = async (req: Request, res: Response) => {
    const { grade } = req.params;

    if (!grade) {
        throw new BadRequest("الصف مطلوب");
    }

    const students = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: Student.grade,
            parentphone: Student.parentphone
        })
        .from(Student)
        .where(eq(Student.grade, grade as any));

    SuccessResponse(res,{message:"تم جلب الطلاب",data:students});
};


export const getallgrades = async (req: Request, res: Response) => {
    const grades = ["1","2","3","4","5","6","7","8","9","10","11","12","13"];
    SuccessResponse(res,{message:"تم جلب جميع الصفوف",data:grades});
};