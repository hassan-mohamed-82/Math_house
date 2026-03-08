"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeMyPassword = exports.updateMyProfile = exports.getMyProfile = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const getAuthenticatedStudentId = (req) => {
    if (!req.user?.id) {
        throw new Errors_1.UnauthorizedError("Not authenticated");
    }
    return req.user.id;
};
const ensureWalletExists = async (studentId) => {
    const [existingWallet] = await connection_1.db
        .select({ id: schema_1.wallet.id, balance: schema_1.wallet.balance })
        .from(schema_1.wallet)
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, studentId));
    if (existingWallet) {
        return existingWallet;
    }
    await connection_1.db.insert(schema_1.wallet).values({
        studentId,
        balance: 0,
    });
    return { balance: 0 };
};
const getStudentProfileData = async (studentId) => {
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        parentphone: schema_1.Student.parentphone,
        grade: schema_1.Student.grade,
        categoryId: schema_1.Student.category,
        categoryName: schema_1.category.name,
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (!student) {
        throw new Errors_1.NotFound("student not found");
    }
    const studentWallet = await ensureWalletExists(student.id);
    return {
        id: student.id,
        firstname: student.firstname,
        lastname: student.lastname,
        nickname: student.nickname,
        fullName: `${student.firstname} ${student.lastname}`,
        email: student.email,
        phone: student.phone,
        parentphone: student.parentphone,
        grade: student.grade,
        category: {
            id: student.categoryId,
            name: student.categoryName,
        },
        wallet: {
            balance: studentWallet.balance,
        },
    };
};
const getMyProfile = async (req, res) => {
    const studentId = getAuthenticatedStudentId(req);
    const profile = await getStudentProfileData(studentId);
    return (0, response_1.SuccessResponse)(res, {
        message: "Profile fetched successfully",
        student: profile,
    });
};
exports.getMyProfile = getMyProfile;
const updateMyProfile = async (req, res) => {
    const studentId = getAuthenticatedStudentId(req);
    const { firstname, lastname, nickname, email, phone, parentphone } = req.body;
    const [existingStudent] = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (!existingStudent) {
        throw new Errors_1.NotFound("student not found");
    }
    if (email && email !== existingStudent.email) {
        const [emailExists] = await connection_1.db
            .select({ id: schema_1.Student.id })
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
        if (emailExists) {
            throw new Errors_1.BadRequest("email already exists");
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
    if (parentphone)
        updateData.parentphone = parentphone;
    if (Object.keys(updateData).length === 0) {
        const profile = await getStudentProfileData(studentId);
        return (0, response_1.SuccessResponse)(res, {
            message: "Profile updated successfully",
            student: profile,
        });
    }
    await connection_1.db
        .update(schema_1.Student)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    const profile = await getStudentProfileData(studentId);
    return (0, response_1.SuccessResponse)(res, {
        message: "Profile updated successfully",
        student: profile,
    });
};
exports.updateMyProfile = updateMyProfile;
const changeMyPassword = async (req, res) => {
    const studentId = getAuthenticatedStudentId(req);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        throw new Errors_1.BadRequest("oldPassword and newPassword are required");
    }
    const [student] = await connection_1.db
        .select({ id: schema_1.Student.id, password: schema_1.Student.password })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    if (!student) {
        throw new Errors_1.NotFound("student not found");
    }
    const isPasswordValid = await bcrypt_1.default.compare(oldPassword, student.password);
    if (!isPasswordValid) {
        throw new Errors_1.BadRequest("old password is not valid");
    }
    const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
    await connection_1.db
        .update(schema_1.Student)
        .set({ password: hashedPassword })
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentId));
    return (0, response_1.SuccessResponse)(res, {
        message: "Password changed successfully",
    });
};
exports.changeMyPassword = changeMyPassword;
