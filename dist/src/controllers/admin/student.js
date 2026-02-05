"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getallgrades = exports.getStudentsByGrade = exports.getStudentsByCategory = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.getAllStudents = exports.createStudent = void 0;
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
        throw new BadRequest_1.BadRequest("جميع الحقول مطلوبة");
    }
    const existingStudent = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
    if (existingStudent.length > 0) {
        throw new BadRequest_1.BadRequest("البريد الإلكتروني مستخدم بالفعل");
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
    (0, response_1.SuccessResponse)(res, { message: "تم إنشاء الطالب بنجاح", data: { id } });
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
    (0, response_1.SuccessResponse)(res, { message: "تم جلب جميع الطلاب", data: students });
};
exports.getAllStudents = getAllStudents;
const getStudentById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("معرف الطالب مطلوب");
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
        throw new NotFound_1.NotFound("الطالب غير موجود");
    }
    (0, response_1.SuccessResponse)(res, { message: "تم جلب الطالب", data: student[0] });
};
exports.getStudentById = getStudentById;
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, nickname, email, phone, category, grade, parentphone, oldPassword, newPassword } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("معرف الطالب مطلوب");
    }
    const existingStudent = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (existingStudent.length === 0) {
        throw new NotFound_1.NotFound("الطالب غير موجود");
    }
    if (email && email !== existingStudent[0].email) {
        const emailExists = await connection_1.db
            .select()
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
        if (emailExists.length > 0) {
            throw new BadRequest_1.BadRequest("البريد الإلكتروني مستخدم بالفعل");
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
            throw new BadRequest_1.BadRequest("كلمة المرور القديمة مطلوبة لتغيير كلمة المرور");
        }
        const isPasswordValid = await bcrypt_1.default.compare(oldPassword, existingStudent[0].password);
        if (!isPasswordValid) {
            throw new BadRequest_1.BadRequest("كلمة المرور القديمة غير صحيحة");
        }
        updateData.password = await bcrypt_1.default.hash(newPassword, 10);
    }
    if (Object.keys(updateData).length === 0) {
        throw new BadRequest_1.BadRequest("لا توجد بيانات للتحديث");
    }
    await connection_1.db
        .update(schema_1.Student)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, { message: "تم تحديث بيانات الطالب بنجاح", data: updateData });
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("معرف الطالب مطلوب");
    }
    const student = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (student.length === 0) {
        throw new NotFound_1.NotFound("الطالب غير موجود");
    }
    await connection_1.db.delete(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, { message: "تم حذف الطالب بنجاح" });
};
exports.deleteStudent = deleteStudent;
const getStudentsByCategory = async (req, res) => {
    const { categoryId } = req.params;
    if (!categoryId) {
        throw new BadRequest_1.BadRequest("معرف الفئة مطلوب");
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
    (0, response_1.SuccessResponse)(res, { message: "تم جلب الطلاب", data: students });
};
exports.getStudentsByCategory = getStudentsByCategory;
const getStudentsByGrade = async (req, res) => {
    const { grade } = req.params;
    if (!grade) {
        throw new BadRequest_1.BadRequest("الصف مطلوب");
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
    (0, response_1.SuccessResponse)(res, { message: "تم جلب الطلاب", data: students });
};
exports.getStudentsByGrade = getStudentsByGrade;
const getallgrades = async (req, res) => {
    const grades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];
    (0, response_1.SuccessResponse)(res, { message: "تم جلب جميع الصفوف", data: grades });
};
exports.getallgrades = getallgrades;
