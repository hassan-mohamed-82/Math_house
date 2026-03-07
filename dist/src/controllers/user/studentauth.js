"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationEmail = exports.verifyStudentEmail = exports.resetPassword = exports.validatePasswordResetCode = exports.forgetPassword = exports.selectcategoryandgrade = exports.studentLogin = exports.studentSignup = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const auth_1 = require("../../utils/auth");
const bcrypt_1 = require("bcrypt");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const drizzle_orm_1 = require("drizzle-orm");
const sendEmails_1 = require("../../utils/sendEmails");
const studentSignup = async (req, res) => {
    const { firstname, lastname, nickname, email, password, phone, category: categoryId, grade, } = req.body;
    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade) {
        throw new Errors_1.BadRequest("All required fields must be provided");
    }
    const existingStudent = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
    if (existingStudent.length > 0) {
        throw new Errors_1.BadRequest("Email is already registered");
    }
    const existingCategory = await connection_1.db
        .select({ id: schema_1.category.id, name: schema_1.category.name, parentCategoryId: schema_1.category.parentCategoryId })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new Errors_1.BadRequest("Category not found");
    }
    if (existingCategory[0].parentCategoryId) {
        throw new Errors_1.BadRequest("Student must be assigned to a main category only");
    }
    const hashedPassword = await (0, bcrypt_1.hash)(password, 10);
    let createdStudentId = "";
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.Student).values({
            firstname,
            lastname,
            nickname,
            email,
            password: hashedPassword,
            phone,
            category: categoryId,
            grade,
            isVerified: false,
        });
        const [createdStudent] = await tx
            .select({ id: schema_1.Student.id })
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
        if (!createdStudent) {
            throw new Errors_1.BadRequest("Student could not be created");
        }
        createdStudentId = createdStudent.id;
        await tx.insert(schema_1.wallet).values({
            studentId: createdStudent.id,
            balance: 0,
        });
    });
    try {
        await (0, sendEmails_1.sendStudentVerificationEmail)({
            studentId: createdStudentId,
            email,
            name: `${firstname} ${lastname}`,
        });
    }
    catch (error) {
        await connection_1.db.transaction(async (tx) => {
            await tx.delete(schema_1.wallet).where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, createdStudentId));
            await tx.delete(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, createdStudentId));
        });
        throw error;
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Student registered successfully. Please verify your email before logging in."
    }, 201);
};
exports.studentSignup = studentSignup;
const studentLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new Errors_1.BadRequest("Email and password are required");
    }
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        password: schema_1.Student.password,
        isVerified: schema_1.Student.isVerified,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        categoryName: schema_1.category.name,
        grade: schema_1.Student.grade,
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
    if (!student) {
        throw new Errors_1.BadRequest("Invalid Credentials");
    }
    const isPasswordValid = await (0, bcrypt_1.compare)(password, student.password);
    if (!isPasswordValid) {
        throw new Errors_1.BadRequest("Invalid Credentials");
    }
    if (!student.isVerified) {
        throw new Errors_1.BadRequest("Please verify your email before logging in");
    }
    const token = (0, auth_1.generateToken)({
        id: student.id,
        name: `${student.firstname} ${student.lastname}`,
        email: student.email,
        role: "student"
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Student logged in successfully",
        token,
        student: {
            id: student.id,
            firstname: student.firstname,
            lastname: student.lastname,
            email: student.email,
            phone: student.phone,
            category: {
                id: student.category,
                name: student.categoryName,
            },
            grade: student.grade
        }
    }, 200);
};
exports.studentLogin = studentLogin;
const selectcategoryandgrade = async (req, res) => {
    const categories = await connection_1.db
        .select({
        id: schema_1.category.id,
        name: schema_1.category.name,
        description: schema_1.category.description,
        image: schema_1.category.image,
    })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.isNull)(schema_1.category.parentCategoryId));
    const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    return (0, response_1.SuccessResponse)(res, {
        message: "Categories and grades fetched successfully",
        categories,
        grades
    }, 200);
};
exports.selectcategoryandgrade = selectcategoryandgrade;
const forgetPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new Errors_1.BadRequest("Email is required");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, normalizedEmail));
    if (student) {
        await (0, sendEmails_1.sendPasswordResetEmail)(student.email, `${student.firstname} ${student.lastname}`);
    }
    return (0, response_1.SuccessResponse)(res, { message: "Password reset instructions sent to email" });
};
exports.forgetPassword = forgetPassword;
const validatePasswordResetCode = async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        throw new Errors_1.BadRequest("Email and reset code are required");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const isValid = await (0, sendEmails_1.verifyPasswordResetCode)(normalizedEmail, String(code).trim());
    if (!isValid) {
        throw new Errors_1.BadRequest("Invalid or expired reset code");
    }
    return (0, response_1.SuccessResponse)(res, { message: "Reset code is valid" });
};
exports.validatePasswordResetCode = validatePasswordResetCode;
const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        throw new Errors_1.BadRequest("Email, reset code and newPassword are required");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedCode = String(code).trim();
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        email: schema_1.Student.email,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, normalizedEmail));
    if (!student) {
        throw new Errors_1.BadRequest("Invalid or expired reset code");
    }
    const isValid = await (0, sendEmails_1.verifyPasswordResetCode)(normalizedEmail, normalizedCode);
    if (!isValid) {
        throw new Errors_1.BadRequest("Invalid or expired reset code");
    }
    const hashedPassword = await (0, bcrypt_1.hash)(String(newPassword), 10);
    await connection_1.db
        .update(schema_1.Student)
        .set({ password: hashedPassword })
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, student.id));
    await (0, sendEmails_1.consumePasswordResetCode)(normalizedEmail);
    return (0, response_1.SuccessResponse)(res, { message: "Password reset successfully" });
};
exports.resetPassword = resetPassword;
const verifyStudentEmail = async (req, res) => {
    const token = String(req.query.token || "").trim();
    if (!token) {
        throw new Errors_1.BadRequest("Verification token is required");
    }
    let payload;
    try {
        payload = (0, sendEmails_1.verifyEmailVerificationToken)(token);
    }
    catch {
        throw new Errors_1.BadRequest("Invalid or expired verification token");
    }
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        email: schema_1.Student.email,
        isVerified: schema_1.Student.isVerified,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, payload.studentId));
    if (!student || student.email !== payload.email) {
        throw new Errors_1.BadRequest("Invalid or expired verification token");
    }
    if (!student.isVerified) {
        await connection_1.db
            .update(schema_1.Student)
            .set({ isVerified: true })
            .where((0, drizzle_orm_1.eq)(schema_1.Student.id, student.id));
    }
    res.status(200).send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Email verified</title></head><body style="font-family: Segoe UI, Arial, sans-serif; background:#fff5f5; margin:0; padding:40px 16px;"><div style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #f2d6d9; border-radius:24px; padding:32px; text-align:center; box-shadow:0 18px 60px rgba(215, 25, 40, 0.14);"><h1 style="color:#d71928; margin:0 0 12px;">Email verified successfully</h1><p style="color:#4b5563; margin:0; font-size:16px; line-height:1.7;">Your Maths House account is now verified. You can return to the app and log in.</p></div></body></html>`);
};
exports.verifyStudentEmail = verifyStudentEmail;
const resendVerificationEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new Errors_1.BadRequest("Email is required");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        isVerified: schema_1.Student.isVerified,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, normalizedEmail));
    if (student && !student.isVerified) {
        await (0, sendEmails_1.sendStudentVerificationEmail)({
            studentId: student.id,
            email: student.email,
            name: `${student.firstname} ${student.lastname}`,
        });
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "If an unverified account exists, a verification email has been sent"
    });
};
exports.resendVerificationEmail = resendVerificationEmail;
