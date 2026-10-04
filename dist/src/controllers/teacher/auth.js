"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherProfile = exports.teacherLogin = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_1 = require("../../utils/auth");
const teacherLogin = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest_1.BadRequest("Email and password are required");
    }
    const [teacher] = await connection_1.db
        .select()
        .from(schema_1.teachers)
        .where((0, drizzle_orm_1.eq)(schema_1.teachers.email, email.trim().toLowerCase()));
    if (!teacher) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    let isPasswordValid = false;
    // Check with bcrypt
    try {
        isPasswordValid = await bcrypt_1.default.compare(password, teacher.password);
    }
    catch {
        isPasswordValid = false;
    }
    // Fallback: check plain-text if password was stored unhashed in seed or dev
    if (!isPasswordValid && teacher.password === password) {
        isPasswordValid = true;
    }
    if (!isPasswordValid) {
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    }
    const token = (0, auth_1.generateToken)({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: "teacher",
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Teacher logged in successfully",
        token,
        teacher: {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email,
            phoneNumber: teacher.phoneNumber,
            avatar: teacher.avatar,
            categoryId: teacher.categoryId,
        },
    }, 200);
};
exports.teacherLogin = teacherLogin;
const getTeacherProfile = async (req, res) => {
    const teacherId = req.user.id;
    const [teacher] = await connection_1.db
        .select({
        id: schema_1.teachers.id,
        name: schema_1.teachers.name,
        email: schema_1.teachers.email,
        phoneNumber: schema_1.teachers.phoneNumber,
        avatar: schema_1.teachers.avatar,
        categoryId: schema_1.teachers.categoryId,
        categoryName: schema_1.category.name,
        createdAt: schema_1.teachers.createdAt,
    })
        .from(schema_1.teachers)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.teachers.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId));
    if (!teacher) {
        throw new Errors_1.NotFound("Teacher not found");
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Teacher profile fetched successfully",
        teacher,
    }, 200);
};
exports.getTeacherProfile = getTeacherProfile;
