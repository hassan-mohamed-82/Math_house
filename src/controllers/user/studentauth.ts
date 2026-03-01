import { Request, Response, NextFunction } from "express";
import { db } from "../../models/connection";
import { Student } from "../../models/schema/admin/Student";
import { generateToken } from "../../utils/auth";
import { compare, hash } from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import { NotFound, BadRequest } from "../../Errors";
import { eq } from "drizzle-orm";
import { category } from "../../models/schema";

export const studentSignup = async (req: Request, res: Response, next: NextFunction) => {
    const { firstname, lastname, nickname, email, password, phone, category, grade } = req.body;

    if (!firstname || !lastname || !nickname || !email || !password || !phone || !category || !grade) {
        throw new BadRequest("All required fields must be provided");
    }

    const existingStudent = await db.select().from(Student).where(eq(Student.email, email));
    if (existingStudent.length > 0) {
        throw new BadRequest("Email is already registered");
    }

    const existcategory= await db.select().from(category).where(eq(category.id, category));{
         if(!existcategory){
            throw new BadRequest("Category not found");
         }
    }


    const hashedPassword = await hash(password, 10);

    const [newStudent] = await db.insert(Student).values({
        firstname,
        lastname,
        nickname,
        email,
        password: hashedPassword,
        phone,
        category,
        grade,
    });

    return SuccessResponse(res, {
        message: "Student registered successfully"
    }, 201);
};

export const studentLogin = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequest("Email and password are required");
    }

    const students = await db.select().from(Student).where(eq(Student.email, email));
    if (students.length === 0) {
        throw new BadRequest("Invalid Credentials");
    }

    const student = students[0];
    const isPasswordValid = await compare(password, student.password);
    if (!isPasswordValid) {
        throw new BadRequest("Invalid Credentials");
    }

    const token = generateToken({
        id: student.id,
        name: `${student.firstname} ${student.lastname}`,
        email: student.email,
        role: "student"
    });

    return SuccessResponse(res, {
        message: "Student logged in successfully",
        token,
        student: {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
            email: student.email,
            phone: student.phone,
            category: student.category,
            grade: student.grade
        }
    }, 200);
};


export const selectcategoryandgrade=async(req:Request,res:Response,next:NextFunction)=>{
    const categories=await db.select().from(category)
    const grades=["1","2","3","4","5","6","7","8","9","10","11","12","13"]
    return SuccessResponse(res,{
        message:"Categories and grades fetched successfully",
        categories,
        grades
    },200)
}