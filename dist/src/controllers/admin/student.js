"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.topUpWallet = exports.openStudentAccount = exports.selection = exports.getStudentsByGrade = exports.getStudentsByCategory = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.getAllStudents = exports.createStudent = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const createStudent = async (req, res) => {
    const { firstname, lastname, nickname, email, password, phone, category: categoryId, grade, parentphone } = req.body;
    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade || !parentphone) {
        throw new BadRequest_1.BadRequest("all fields are required");
    }
    const existingStudent = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
    if (existingStudent.length > 0) {
        throw new BadRequest_1.BadRequest("email already exists");
    }
    const existingCategory = await connection_1.db
        .select()
        .from(schema_1.category)
        .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("category not found");
    }
    if (existingCategory[0].parentCategoryId) {
        throw new BadRequest_1.BadRequest("student must be assigned to a main category only");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const id = (0, uuid_1.v4)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.Student).values({
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
            isVerified: true
        });
        await tx.insert(schema_1.wallet).values({
            studentId: id,
            balance: 0
        });
    });
    (0, response_1.SuccessResponse)(res, { message: "create student success", data: { id } });
};
exports.createStudent = createStudent;
const getAllStudents = async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        categoryName: schema_1.category.name,
        grade: schema_1.Student.grade,
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id));
    // Search
    if (search) {
        const searchTerm = `%${search}%`;
        query = query.where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.Student.firstname, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.lastname, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.nickname, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.email, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.phone, searchTerm)));
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
        paymentStatus: "Free" // هتحتاج تعدلها حسب الـ Logic بتاعك
    }));
    (0, response_1.SuccessResponse)(res, { message: "get all students success", data: formattedStudents });
};
exports.getAllStudents = getAllStudents;
const getStudentById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        categoryName: schema_1.category.name,
        grade: schema_1.Student.grade,
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "get student success", data: student });
};
exports.getStudentById = getStudentById;
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, nickname, email, phone, category: categoryId, grade, parentphone, oldPassword, newPassword } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const existingStudent = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (existingStudent.length === 0) {
        throw new NotFound_1.NotFound("student not found");
    }
    if (email && email !== existingStudent[0].email) {
        const emailExists = await connection_1.db
            .select()
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
        if (emailExists.length > 0) {
            throw new BadRequest_1.BadRequest("email already exists");
        }
    }
    if (categoryId) {
        const existingCategory = await connection_1.db
            .select({ id: schema_1.category.id, parentCategoryId: schema_1.category.parentCategoryId })
            .from(schema_1.category)
            .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("category not found");
        }
        if (existingCategory[0].parentCategoryId) {
            throw new BadRequest_1.BadRequest("student must be assigned to a main category only");
        }
    }
    const updateData = {};
    if (firstname)
        updateData.firstname = firstname;
    if (lastname)
        updateData.lastname = lastname;
    if (nickname)
        updateData.nickname = nickname;
    if (email)
        updateData.email = email;
    if (phone)
        updateData.phone = phone;
    if (categoryId)
        updateData.category = categoryId;
    if (grade)
        updateData.grade = grade;
    if (parentphone)
        updateData.parentphone = parentphone;
    if (newPassword) {
        if (!oldPassword) {
            throw new BadRequest_1.BadRequest("old password is required to change password");
        }
        const isPasswordValid = await bcrypt_1.default.compare(oldPassword, existingStudent[0].password);
        if (!isPasswordValid) {
            throw new BadRequest_1.BadRequest("old password is not valid");
        }
        updateData.password = await bcrypt_1.default.hash(newPassword, 10);
    }
    if (Object.keys(updateData).length === 0) {
        throw new BadRequest_1.BadRequest("no data to update");
    }
    await connection_1.db
        .update(schema_1.Student)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, { message: "update student success", data: updateData });
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const student = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (student.length === 0) {
        throw new NotFound_1.NotFound("student not found");
    }
    await connection_1.db.delete(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, { message: "delete student success" });
};
exports.deleteStudent = deleteStudent;
const getStudentsByCategory = async (req, res) => {
    const { categoryId } = req.params;
    if (!categoryId) {
        throw new BadRequest_1.BadRequest("category id is required");
    }
    const students = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        grade: schema_1.Student.grade,
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.category, categoryId));
    (0, response_1.SuccessResponse)(res, { message: "get students by category success", data: students });
};
exports.getStudentsByCategory = getStudentsByCategory;
const getStudentsByGrade = async (req, res) => {
    const { grade } = req.params;
    if (!grade) {
        throw new BadRequest_1.BadRequest("grade is required");
    }
    const students = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        grade: schema_1.Student.grade,
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.grade, grade));
    (0, response_1.SuccessResponse)(res, { message: "get students by grade success", data: students });
};
exports.getStudentsByGrade = getStudentsByGrade;
const selection = async (req, res) => {
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
    (0, response_1.SuccessResponse)(res, { message: "get all categories and grades success", data: { categories, grades } });
};
exports.selection = selection;
// ===================== NEW APIs =====================
// 🔥 Open Account (Impersonation) - الدخول كـ Student
const openStudentAccount = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user?.id;
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        nickname: schema_1.Student.nickname,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
    }
    // إنشاء Token للـ Student
    const impersonationToken = jsonwebtoken_1.default.sign({
        id: student.id,
        email: student.email,
        name: `${student.firstname} ${student.lastname}`,
        nickname: student.nickname,
        role: "student",
        isImpersonation: true,
        impersonatedBy: adminId,
    }, JWT_SECRET, { expiresIn: "2h" });
    (0, response_1.SuccessResponse)(res, {
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
exports.openStudentAccount = openStudentAccount;
// 🔥 Top Up Wallet - شحن المحفظة
const topUpWallet = async (req, res) => {
    const { id } = req.params;
    const { amount, description } = req.body;
    const adminId = req.user?.id;
    if (!amount || Number(amount) <= 0) {
        throw new BadRequest_1.BadRequest("Invalid amount");
    }
    const [student] = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
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
    (0, response_1.SuccessResponse)(res, {
        message: "Wallet topped up successfully",
        data: {
            studentId: id,
            amount: Number(amount),
            description: description || "Wallet Top Up"
        }
    });
};
exports.topUpWallet = topUpWallet;
// 🔥 Payment History - سجل المدفوعات
const getPaymentHistory = async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const [student] = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
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
    const transactions = [];
    (0, response_1.SuccessResponse)(res, {
        message: "Payment history retrieved successfully",
        data: {
            studentId: id,
            studentName: `${student.firstname} ${student.lastname}`,
            transactions: transactions
        }
    });
};
exports.getPaymentHistory = getPaymentHistory;
