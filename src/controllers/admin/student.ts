import { Request, Response } from "express";
import { db } from "../../models/connection";
import { category, parents, Student } from "../../models/schema";
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
        throw new BadRequest("all fields are required");
    }

    const existingStudent = await db
        .select()
        .from(Student)
        .where(eq(Student.email, email));

    if (existingStudent.length > 0) {
        throw new BadRequest("email already exists");
    }

    const existingCategory = await db
        .select()
        .from(category)
        .where(eq(category.id, category));

    if (existingCategory.length === 0) {
        throw new BadRequest("category not found");
    }

    const existingGrade = await db
        .select()
        .from(category)
        .where(eq(category.id, category));

    if (existingGrade.length === 0) {
        throw new BadRequest("grade not found");
    }
    const existingParent = await db
        .select()
        .from(parents)
        .where(eq(parents.id, parentphone));

    if (existingParent.length === 0) {
        throw new BadRequest("parent not found");
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

    SuccessResponse(res,{message:"create student success",data:{id}});
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

    SuccessResponse(res,{message:"get all students success",data:students});
};

export const getStudentById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("id is required");
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
        throw new NotFound("student not found");
    }

    SuccessResponse(res,{message:"get student success",data:student[0]});
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
        throw new BadRequest("id is required");
    }

    const existingStudent = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (existingStudent.length === 0) {
        throw new NotFound("student not found");
    }

    if (email && email !== existingStudent[0].email) {
        const emailExists = await db
            .select()
            .from(Student)
            .where(eq(Student.email, email));

        if (emailExists.length > 0) {
            throw new BadRequest("email already exists");
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
            throw new BadRequest("old password is required to change password");
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, existingStudent[0].password);

        if (!isPasswordValid) {
            throw new BadRequest("old password is not valid");
        }

        updateData.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updateData).length === 0) {
        throw new BadRequest("no data to update");
    }

    await db
        .update(Student)
        .set(updateData)
        .where(eq(Student.id, id));
     
        SuccessResponse(res,{message:"update student success",data:updateData});
};

export const deleteStudent = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("id is required");
    }

    const student = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (student.length === 0) {
        throw new NotFound("student not found");
    }

    await db.delete(Student).where(eq(Student.id, id));

    SuccessResponse(res,{message:"delete student success"});
};

export const getStudentsByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    if (!categoryId) {
        throw new BadRequest("category id is required");
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

    SuccessResponse(res,{message:"get students by category success",data:students});
};

export const getStudentsByGrade = async (req: Request, res: Response) => {
    const { grade } = req.params;

    if (!grade) {
        throw new BadRequest("grade is required");
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

    SuccessResponse(res,{message:"get students by grade success",data:students});
};


export const getallgrades = async (req: Request, res: Response) => {
    const grades = ["1","2","3","4","5","6","7","8","9","10","11","12","13"];
    SuccessResponse(res,{message:"get all grades success",data:grades});
};


export const selection = async (req: Request, res: Response) => {
    const categories = await db.select().from(category);
     const grades = ["1","2","3","4","5","6","7","8","9","10","11","12","13"];
    SuccessResponse(res,{message:"get all categories and grades success",data:{categories,grades}});
};