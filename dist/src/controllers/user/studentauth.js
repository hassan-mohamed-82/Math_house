"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectcategoryandgrade = exports.studentLogin = exports.studentSignup = void 0;
const connection_1 = require("../../models/connection");
const Student_1 = require("../../models/schema/admin/Student");
const auth_1 = require("../../utils/auth");
const bcrypt_1 = require("bcrypt");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../models/schema");
const studentSignup = async (req, res, next) => {
    const { firstname, lastname, nickname, email, password, phone, category, grade } = req.body;
    if (!firstname || !lastname || !nickname || !email || !password || !phone || !category || !grade) {
        throw new Errors_1.BadRequest("All required fields must be provided");
    }
    const existingStudent = await connection_1.db.select().from(Student_1.Student).where((0, drizzle_orm_1.eq)(Student_1.Student.email, email));
    if (existingStudent.length > 0) {
        throw new Errors_1.BadRequest("Email is already registered");
    }
    const existcategory = await connection_1.db.select().from(category).where((0, drizzle_orm_1.eq)(category.id, category));
    {
        if (!existcategory) {
            throw new Errors_1.BadRequest("Category not found");
        }
    }
    const hashedPassword = await (0, bcrypt_1.hash)(password, 10);
    const [newStudent] = await connection_1.db.insert(Student_1.Student).values({
        firstname,
        lastname,
        nickname,
        email,
        password: hashedPassword,
        phone,
        category,
        grade,
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Student registered successfully"
    }, 201);
};
exports.studentSignup = studentSignup;
const studentLogin = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new Errors_1.BadRequest("Email and password are required");
    }
    const students = await connection_1.db.select().from(Student_1.Student).where((0, drizzle_orm_1.eq)(Student_1.Student.email, email));
    if (students.length === 0) {
        throw new Errors_1.BadRequest("Invalid Credentials");
    }
    const student = students[0];
    const isPasswordValid = await (0, bcrypt_1.compare)(password, student.password);
    if (!isPasswordValid) {
        throw new Errors_1.BadRequest("Invalid Credentials");
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
            category: student.category,
            grade: student.grade
        }
    }, 200);
};
exports.studentLogin = studentLogin;
const selectcategoryandgrade = async (req, res, next) => {
    const categories = await connection_1.db.select().from(schema_1.category);
    const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    return (0, response_1.SuccessResponse)(res, {
        message: "Categories and grades fetched successfully",
        categories,
        grades
    }, 200);
};
exports.selectcategoryandgrade = selectcategoryandgrade;
