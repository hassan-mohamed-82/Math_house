"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selection = exports.getallgrades = exports.getStudentsByGrade = exports.getStudentsByCategory = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.getAllStudents = exports.createStudent = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const createStudent = async (req, res) => {
    const { firstname, lastname, nickname, email, password, phone, category, grade, parentphone } = req.body;
    if (!firstname || !lastname || !nickname || !email || !password || !phone || !category || !grade || !parentphone) {
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
        .from(category)
        .where((0, drizzle_orm_1.eq)(category.id, category));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("category not found");
    }
    const existingGrade = await connection_1.db
        .select()
        .from(category)
        .where((0, drizzle_orm_1.eq)(category.id, category));
    if (existingGrade.length === 0) {
        throw new BadRequest_1.BadRequest("grade not found");
    }
    const existingParent = await connection_1.db
        .select()
        .from(schema_1.parents)
        .where((0, drizzle_orm_1.eq)(schema_1.parents.id, parentphone));
    if (existingParent.length === 0) {
        throw new BadRequest_1.BadRequest("parent not found");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const id = (0, uuid_1.v4)();
    await connection_1.db.insert(schema_1.Student).values({
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
    (0, response_1.SuccessResponse)(res, { message: "create student success", data: { id } });
};
exports.createStudent = createStudent;
const getAllStudents = async (req, res) => {
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
        .from(schema_1.Student);
    (0, response_1.SuccessResponse)(res, { message: "get all students success", data: students });
};
exports.getAllStudents = getAllStudents;
const getStudentById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const student = await connection_1.db
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
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (student.length === 0) {
        throw new NotFound_1.NotFound("student not found");
    }
    (0, response_1.SuccessResponse)(res, { message: "get student success", data: student[0] });
};
exports.getStudentById = getStudentById;
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, nickname, email, phone, category, grade, parentphone, oldPassword, newPassword } = req.body;
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
    if (category)
        updateData.category = category;
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
const getallgrades = async (req, res) => {
    const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    (0, response_1.SuccessResponse)(res, { message: "get all grades success", data: grades });
};
exports.getallgrades = getallgrades;
const selection = async (req, res) => {
    const categories = await connection_1.db.select().from(schema_1.category);
    const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    (0, response_1.SuccessResponse)(res, { message: "get all categories and grades success", data: { categories, grades } });
};
exports.selection = selection;
