import { Request, Response } from "express";
import { db } from "../../models/connection";
import { category, Student, wallet, grade as gradeTable } from "../../models/schema";
import { eq, or, like, isNull, and } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { handleImageUpdate, validateAndSaveLogo, deleteImage } from "../../utils/handleImages";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const createStudent = async (req: Request, res: Response) => {
    const {
        firstname,
        lastname,
        nickname,
        email,
        password,
        phone,
        category: categoryId,
        grade,
        parentphone,
        avatar,
    } = req.body;

    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade ) {
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
        .where(eq(category.id, categoryId));

    if (existingCategory.length === 0) {
        throw new BadRequest("category not found");
    }

    if (existingCategory[0].parentCategoryId) {
        throw new BadRequest("student must be assigned to a main category only");
    }

    const [existingGrade] = await db
        .select()
        .from(gradeTable)
        .where(and(eq(gradeTable.id, grade), eq(gradeTable.parentCategoryId, categoryId)));

    if (!existingGrade) {
        throw new BadRequest("grade not found or does not belong to the selected category");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const imgUrl = avatar ? await validateAndSaveLogo(req, avatar, "students") : null;
    await db.transaction(async (tx) => {
        await tx.insert(Student).values({
            id,
            firstname,
            lastname,
            nickname,
            email,
            password: hashedPassword,
            phone,
            category: categoryId,
            grade,
            parentphone,
            isVerified: true,
            avatar: imgUrl
        });

        await tx.insert(wallet).values({
            studentId: id,
            balance: 0
        });
    });

    SuccessResponse(res, { message: "create student success", data: { id } });
};

export const getAllStudents = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            categoryName: category.name,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(category, eq(Student.category, category.id))
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id));

    // Search
    if (search) {
        const searchTerm = `%${search}%`;
        query = query.where(
            or(
                like(Student.firstname, searchTerm),
                like(Student.lastname, searchTerm),
                like(Student.nickname, searchTerm),
                like(Student.email, searchTerm),
                like(Student.phone, searchTerm)
            )
        ) as any;
    }

    const students = await query.limit(Number(limit)).offset(offset);

    // Format response like the image
    const formattedStudents = students.map(s => ({
        id: s.id,
        name: `${s.firstname} ${s.lastname} (${s.nickname})`,
        firstname: s.firstname,
        lastname: s.lastname,
        nickname: s.nickname,
        email: s.email,
        phone: s.phone,
        parentPhone: s.parentphone,
        category: s.category,
        categoryName: s.categoryName,
        grade: s.grade,
        avatar: s.avatar,
        paymentStatus: "Free" // هتحتاج تعدلها حسب الـ Logic بتاعك
    }));

    SuccessResponse(res, { message: "get all students success", data: formattedStudents });
};

export const getStudentById = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("id is required");
    }

    const [student] = await db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            categoryName: category.name,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(category, eq(Student.category, category.id))
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    SuccessResponse(res, { message: "get student success", data: student });
};

export const updateStudent = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        firstname,
        lastname,
        nickname,
        email,
        phone,
        category: categoryId,
        grade,
        parentphone,
        oldPassword,
        newPassword,
        avatar
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

    if (categoryId) {
        const existingCategory = await db
            .select({ id: category.id, parentCategoryId: category.parentCategoryId })
            .from(category)
            .where(eq(category.id, categoryId));

        if (existingCategory.length === 0) {
            throw new BadRequest("category not found");
        }

        if (existingCategory[0].parentCategoryId) {
            throw new BadRequest("student must be assigned to a main category only");
        }
    }

    if (grade) {
        const catId = categoryId || existingStudent[0].category;
        const [existingGrade] = await db
            .select()
            .from(gradeTable)
            .where(and(eq(gradeTable.id, grade), eq(gradeTable.parentCategoryId, catId)));

        if (!existingGrade) {
            throw new BadRequest("grade not found or does not belong to the selected category");
        }
    }
    let ImgUrl;
    if (avatar) {
    ImgUrl = await handleImageUpdate(req, existingStudent[0].avatar, avatar, "students");
    }
    const updateData: any = {};

    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (nickname) updateData.nickname = nickname;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (categoryId) updateData.category = categoryId;
    if (avatar) updateData.avatar = ImgUrl;
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

    SuccessResponse(res, { message: "update student success", data: updateData });
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

    if (student[0].avatar) {
        await deleteImage(student[0].avatar);
    }
    await db.delete(wallet).where(eq(wallet.studentId, id));
    await db.delete(Student).where(eq(Student.id, id));

    SuccessResponse(res, { message: "delete student success" });
};

export const getStudentsByCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    if (!categoryId) {
        throw new BadRequest("category id is required");
    }

    const students = await db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .where(eq(Student.category, categoryId));

    SuccessResponse(res, { message: "get students by category success", data: students });
};

export const getStudentsByGrade = async (req: Request, res: Response) => {
    const { grade } = req.params;

    if (!grade) {
        throw new BadRequest("grade is required");
    }

    const students = await db
        .select({
            id: Student.id,
            avatar: Student.avatar,
            firstname: Student.firstname,
            lastname: Student.lastname,
            nickname: Student.nickname,
            email: Student.email,
            phone: Student.phone,
            category: Student.category,
            grade: {
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            },
            parentphone: Student.parentphone
        })
        .from(Student)
        .leftJoin(gradeTable, eq(Student.grade, gradeTable.id))
        .where(eq(Student.grade, grade));

    SuccessResponse(res, { message: "get students by grade success", data: students });
};

export const selection = async (req: Request, res: Response) => {
    const { categoryId } = req.query;

    const categories = await db
        .select({
            id: category.id,
            name: category.name,
            description: category.description,
            image: category.image,
        })
        .from(category)
        .where(isNull(category.parentCategoryId));

    let grades: any[] = [];
    if (categoryId) {
        grades = await db
            .select({
                id: gradeTable.id,
                name: gradeTable.name,
                nameAr: gradeTable.nameAr,
            })
            .from(gradeTable)
            .where(eq(gradeTable.parentCategoryId, String(categoryId)));
    }

    SuccessResponse(res, { message: "get all categories and grades success", data: { categories, grades } });
};


// ===================== NEW APIs =====================

// 🔥 Open Account (Impersonation) - الدخول كـ Student
export const openStudentAccount = async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = (req as any).user?.id;

    const [student] = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            email: Student.email,
            nickname: Student.nickname,
        })
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    // إنشاء Token للـ Student
    const impersonationToken = jwt.sign(
        {
            id: student.id,
            email: student.email,
            name: `${student.firstname} ${student.lastname}`,
            nickname: student.nickname,
            role: "student",
            isImpersonation: true,
            impersonatedBy: adminId,
        },
        JWT_SECRET,
        { expiresIn: "2h" }
    );

    SuccessResponse(res, {
        message: "Account opened successfully",
        data: {
            token: impersonationToken,
            redirectUrl: `/student/dashboard`,
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
                email: student.email
            }
        }
    });
};

// 🔥 Top Up Wallet - شحن المحفظة
export const topUpWallet = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { amount, description } = req.body;
    const adminId = (req as any).user?.id;

    if (!amount || Number(amount) <= 0) {
        throw new BadRequest("Invalid amount");
    }

    const [student] = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    // لو عندك جدول wallet أو walletBalance في الـ Student
    // هنا هتضيف الـ Logic بتاع الشحن

    // مثال: لو عندك جدول transactions
    /*
    await db.insert(walletTransactions).values({
        studentId: id,
        amount: amount,
        type: "topup",
        description: description || "Wallet Top Up",
        createdBy: adminId
    });
    */

    SuccessResponse(res, {
        message: "Wallet topped up successfully",
        data: {
            studentId: id,
            amount: Number(amount),
            description: description || "Wallet Top Up"
        }
    });
};

// 🔥 Payment History - سجل المدفوعات
export const getPaymentHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const [student] = await db
        .select()
        .from(Student)
        .where(eq(Student.id, id));

    if (!student) {
        throw new NotFound("student not found");
    }

    // لو عندك جدول transactions
    /*
    const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.studentId, id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit));
    */

    // مؤقتاً نرجع array فاضي
    const transactions: any[] = [];

    SuccessResponse(res, {
        message: "Payment history retrieved successfully",
        data: {
            studentId: id,
            studentName: `${student.firstname} ${student.lastname}`,
            transactions: transactions
        }
    });
};