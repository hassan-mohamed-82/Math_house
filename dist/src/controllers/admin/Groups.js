"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGroup = exports.updateGroup = exports.getGroupById = exports.getAllGroups = exports.createGroup = exports.searchStudents = exports.selectOptions = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const Groups_1 = require("../../models/schema/admin/Groups");
const Student_1 = require("../../models/schema/admin/Student");
const teacher_1 = require("../../models/schema/admin/teacher");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
// ===================== SELECT APIs للـ Dropdowns =====================
// جلب Students و Teachers للـ Select dropdowns
const selectOptions = async (req, res) => {
    const [students, teachersList] = await Promise.all([
        connection_1.db.select({
            id: Student_1.Student.id,
            name: (0, drizzle_orm_1.sql) `CONCAT(${Student_1.Student.firstname}, ' ', ${Student_1.Student.lastname})`,
            nickname: Student_1.Student.nickname,
        }).from(Student_1.Student),
        connection_1.db.select({
            id: teacher_1.teachers.id,
            name: teacher_1.teachers.name,
        }).from(teacher_1.teachers),
    ]);
    (0, response_1.SuccessResponse)(res, {
        students: students.map(s => ({
            value: s.id,
            label: s.name,
            nickname: s.nickname
        })),
        teachers: teachersList.map(t => ({
            value: t.id,
            label: t.name
        })),
    });
};
exports.selectOptions = selectOptions;
// ===================== SEARCH API =====================
// البحث في الـ Students
const searchStudents = async (req, res) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;
    const students = await connection_1.db
        .select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
        nickname: Student_1.Student.nickname,
        email: Student_1.Student.email,
        phone: Student_1.Student.phone,
    })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(Student_1.Student.firstname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.lastname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.nickname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.email, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.phone, searchTerm)))
        .limit(20);
    (0, response_1.SuccessResponse)(res, students.map(s => ({
        value: s.id,
        label: `${s.firstname} ${s.lastname}`,
        nickname: s.nickname,
        email: s.email
    })));
};
exports.searchStudents = searchStudents;
// ===================== GROUPS CRUD =====================
// إنشاء Group جديد
const createGroup = async (req, res) => {
    const { name, teacherId, days, timeFrom, timeTo, studentIds, isActive = true } = req.body;
    // Validation
    if (!name || !teacherId || !days || !timeFrom || !timeTo) {
        throw new BadRequest_1.BadRequest("Missing required fields");
    }
    const groupId = (0, crypto_1.randomUUID)();
    // إنشاء الـ Group
    await connection_1.db.insert(Groups_1.groups).values({
        id: groupId,
        name,
        teacherId,
        days: days, // ["Sun", "Mon", etc.]
        timeFrom,
        timeTo,
        isActive
    });
    // إضافة الـ Students للـ Group
    if (studentIds && studentIds.length > 0) {
        const groupStudentRecords = studentIds.map((studentId) => ({
            groupId: groupId,
            studentId
        }));
        await connection_1.db.insert(Groups_1.groupStudents).values(groupStudentRecords);
    }
    (0, response_1.SuccessResponse)(res, { id: groupId }, 201);
};
exports.createGroup = createGroup;
// جلب كل الـ Groups
const getAllGroups = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const groupsList = await connection_1.db
        .select({
        id: Groups_1.groups.id,
        name: Groups_1.groups.name,
        teacherId: Groups_1.groups.teacherId,
        teacherName: teacher_1.teachers.name,
        days: Groups_1.groups.days,
        timeFrom: Groups_1.groups.timeFrom,
        timeTo: Groups_1.groups.timeTo,
        isActive: Groups_1.groups.isActive,
        createdAt: Groups_1.groups.createdAt,
    })
        .from(Groups_1.groups)
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Groups_1.groups.teacherId, teacher_1.teachers.id))
        .limit(Number(limit))
        .offset(offset);
    // جلب الـ Students لكل Group ومراعاة نوع الـ days
    const groupsWithStudents = await Promise.all(groupsList.map(async (group) => {
        const students = await connection_1.db
            .select({
            id: Student_1.Student.id,
            name: (0, drizzle_orm_1.sql) `CONCAT(${Student_1.Student.firstname}, ' ', ${Student_1.Student.lastname})`,
        })
            .from(Groups_1.groupStudents)
            .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, Student_1.Student.id))
            .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, group.id));
        return {
            ...group,
            days: typeof group.days === "string" ? JSON.parse(group.days) : group.days,
            students
        };
    }));
    (0, response_1.SuccessResponse)(res, groupsWithStudents);
};
exports.getAllGroups = getAllGroups;
// جلب Group واحد بالـ ID
const getGroupById = async (req, res) => {
    const { id } = req.params;
    const [group] = await connection_1.db
        .select({
        id: Groups_1.groups.id,
        name: Groups_1.groups.name,
        teacherId: Groups_1.groups.teacherId,
        teacherName: teacher_1.teachers.name,
        days: Groups_1.groups.days,
        timeFrom: Groups_1.groups.timeFrom,
        timeTo: Groups_1.groups.timeTo,
        isActive: Groups_1.groups.isActive,
    })
        .from(Groups_1.groups)
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Groups_1.groups.teacherId, teacher_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(Groups_1.groups.id, id));
    if (!group) {
        throw new Errors_1.NotFound("Group not found");
    }
    // جلب الـ Students
    const students = await connection_1.db
        .select({
        id: Student_1.Student.id,
        name: (0, drizzle_orm_1.sql) `CONCAT(${Student_1.Student.firstname}, ' ', ${Student_1.Student.lastname})`,
        nickname: Student_1.Student.nickname,
    })
        .from(Groups_1.groupStudents)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, Student_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, id));
    (0, response_1.SuccessResponse)(res, {
        ...group,
        days: typeof group.days === "string" ? JSON.parse(group.days) : group.days,
        students
    });
};
exports.getGroupById = getGroupById;
// تحديث Group
const updateGroup = async (req, res) => {
    const { id } = req.params;
    const { name, teacherId, days, timeFrom, timeTo, studentIds, isActive } = req.body;
    // تحديث الـ Group
    await connection_1.db.update(Groups_1.groups)
        .set({
        name,
        teacherId,
        days,
        timeFrom,
        timeTo,
        isActive,
        updatedAt: new Date()
    })
        .where((0, drizzle_orm_1.eq)(Groups_1.groups.id, id));
    // تحديث الـ Students إذا تم إرسالهم
    if (studentIds !== undefined) {
        // حذف الـ Students القديمين
        await connection_1.db.delete(Groups_1.groupStudents).where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, id));
        // إضافة الـ Students الجدد
        if (studentIds.length > 0) {
            const groupStudentRecords = studentIds.map((studentId) => ({
                groupId: id,
                studentId
            }));
            await connection_1.db.insert(Groups_1.groupStudents).values(groupStudentRecords);
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Group updated successfully" });
};
exports.updateGroup = updateGroup;
// حذف Group
const deleteGroup = async (req, res) => {
    const { id } = req.params;
    // حذف الـ Students من الـ Group أولاً
    await connection_1.db.delete(Groups_1.groupStudents).where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, id));
    // حذف الـ Group
    await connection_1.db.delete(Groups_1.groups).where((0, drizzle_orm_1.eq)(Groups_1.groups.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Group deleted successfully" });
};
exports.deleteGroup = deleteGroup;
