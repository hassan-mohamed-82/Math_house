"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSession = exports.updateSession = exports.getSessionById = exports.getAllSessions = exports.createSession = exports.searchUsers = exports.getGroupUsers = exports.selectOptions = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const Session_1 = require("../../models/schema/admin/Session");
const Groups_1 = require("../../models/schema/admin/Groups");
const Student_1 = require("../../models/schema/admin/Student");
const teacher_1 = require("../../models/schema/admin/teacher");
const category_1 = require("../../models/schema/admin/category");
const courses_1 = require("../../models/schema/admin/courses");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
// ===================== SELECT OPTIONS =====================
// جلب Groups و Teachers للـ Select dropdowns
const selectOptions = async (req, res) => {
    const [groupsList, teachersList, categoriesList, coursesList] = await Promise.all([
        connection_1.db.select({
            id: Groups_1.groups.id,
            name: Groups_1.groups.name,
        }).from(Groups_1.groups).where((0, drizzle_orm_1.eq)(Groups_1.groups.isActive, true)),
        connection_1.db.select({
            id: teacher_1.teachers.id,
            name: teacher_1.teachers.name,
        }).from(teacher_1.teachers),
        connection_1.db.select({
            id: category_1.category.id,
            name: category_1.category.name,
        }).from(category_1.category),
        connection_1.db.select({
            id: courses_1.courses.id,
            name: courses_1.courses.name,
            categoryId: courses_1.courses.categoryId,
        }).from(courses_1.courses),
    ]);
    (0, response_1.SuccessResponse)(res, {
        groups: groupsList.map(g => ({
            value: g.id,
            label: g.name
        })),
        teachers: teachersList.map(t => ({
            value: t.id,
            label: t.name
        })),
        categories: categoriesList.map(c => ({
            value: c.id,
            label: c.name
        })),
        courses: coursesList.map(c => ({
            value: c.id,
            label: c.name,
            categoryId: c.categoryId
        })),
    });
};
exports.selectOptions = selectOptions;
// ===================== USERS APIs =====================
// جلب الـ Users اللي في Group معين (لما تختار Group)
const getGroupUsers = async (req, res) => {
    const { groupId } = req.params;
    const users = await connection_1.db
        .select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
        nickname: Student_1.Student.nickname,
        email: Student_1.Student.email,
        phone: Student_1.Student.phone,
    })
        .from(Groups_1.groupStudents)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, Student_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, groupId));
    (0, response_1.SuccessResponse)(res, users.map(u => ({
        value: u.id,
        label: `${u.firstname} ${u.lastname}`,
        nickname: u.nickname,
        email: u.email,
        phone: u.phone
    })));
};
exports.getGroupUsers = getGroupUsers;
const searchUsers = async (req, res) => {
    const { q, excludeIds } = req.query;
    const searchValue = (q ?? "").toString().trim().toLowerCase();
    const searchTerm = `%${searchValue}%`;
    let excludeIdsList = [];
    if (excludeIds && typeof excludeIds === "string" && excludeIds.trim() !== "") {
        excludeIdsList = excludeIds.split(",");
    }
    let users = await connection_1.db
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
    if (excludeIdsList.length > 0) {
        users = users.filter(u => !excludeIdsList.includes(u.id));
    }
    (0, response_1.SuccessResponse)(res, users.map(u => ({
        value: u.id,
        label: `${u.firstname} ${u.lastname}`,
        nickname: u.nickname,
        email: u.email
    })));
};
exports.searchUsers = searchUsers;
// ===================== SESSIONS CRUD =====================
// إنشاء Session جديدة
const createSession = async (req, res) => {
    const { name, sessionDate, timeFrom, timeTo, categoryId, courseId, lessonId, lessonName, type, groupId, teacherId, session_link, material_link, teacher_material_link, userIds } = req.body;
    if (!name || !sessionDate || !timeFrom || !timeTo || !type || !teacherId || !session_link) {
        throw new BadRequest_1.BadRequest("Missing required fields");
    }
    const sessionId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(Session_1.sessions).values({
        id: sessionId,
        name,
        sessionDate,
        timeFrom,
        timeTo,
        categoryId,
        courseId,
        lessonId,
        lessonName,
        type,
        groupId: type === "group" ? groupId : null,
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
    });
    let finalUserIds = userIds || [];
    // لو Type = group و مفيش userIds، نجيب Users الـ Group تلقائياً
    if (type === "group" && groupId && (!userIds || userIds.length === 0)) {
        const groupUsers = await connection_1.db
            .select({ studentId: Groups_1.groupStudents.studentId })
            .from(Groups_1.groupStudents)
            .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, groupId));
        finalUserIds = groupUsers.map(u => u.studentId);
    }
    if (finalUserIds.length > 0) {
        const sessionUserRecords = finalUserIds.map((userId) => ({
            sessionId: sessionId,
            studentId: userId
        }));
        await connection_1.db.insert(Session_1.sessionUsers).values(sessionUserRecords);
    }
    (0, response_1.SuccessResponse)(res, { id: sessionId }, 201);
};
exports.createSession = createSession;
// جلب كل الـ Sessions مع Filter
const getAllSessions = async (req, res) => {
    const { page = 1, limit = 10, date, type, teacherId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (date) {
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.sessionDate, new Date(date)));
    }
    if (type) {
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.type, type));
    }
    if (teacherId) {
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacherId));
    }
    const sessionsList = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        categoryId: Session_1.sessions.categoryId,
        categoryName: category_1.category.name,
        courseId: Session_1.sessions.courseId,
        courseName: courses_1.courses.name,
        lessonName: Session_1.sessions.lessonName,
        type: Session_1.sessions.type,
        groupId: Session_1.sessions.groupId,
        groupName: Groups_1.groups.name,
        teacherId: Session_1.sessions.teacherId,
        teacherName: teacher_1.teachers.name,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
    })
        .from(Session_1.sessions)
        .leftJoin(category_1.category, (0, drizzle_orm_1.eq)(Session_1.sessions.categoryId, category_1.category.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(Session_1.sessions.courseId, courses_1.courses.id))
        .leftJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessions.groupId, Groups_1.groups.id))
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacher_1.teachers.id))
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy(Session_1.sessions.sessionDate)
        .limit(Number(limit))
        .offset(offset);
    (0, response_1.SuccessResponse)(res, sessionsList);
};
exports.getAllSessions = getAllSessions;
// جلب Session واحدة بالـ ID (مع الـ Users)
const getSessionById = async (req, res) => {
    const { id } = req.params;
    const [session] = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        categoryId: Session_1.sessions.categoryId,
        categoryName: category_1.category.name,
        courseId: Session_1.sessions.courseId,
        courseName: courses_1.courses.name,
        lessonName: Session_1.sessions.lessonName,
        type: Session_1.sessions.type,
        groupId: Session_1.sessions.groupId,
        groupName: Groups_1.groups.name,
        teacherId: Session_1.sessions.teacherId,
        teacherName: teacher_1.teachers.name,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
    })
        .from(Session_1.sessions)
        .leftJoin(category_1.category, (0, drizzle_orm_1.eq)(Session_1.sessions.categoryId, category_1.category.id))
        .leftJoin(courses_1.courses, (0, drizzle_orm_1.eq)(Session_1.sessions.courseId, courses_1.courses.id))
        .leftJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessions.groupId, Groups_1.groups.id))
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacher_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
    if (!session) {
        throw new Errors_1.NotFound("Session not found");
    }
    // جلب الـ Users
    const users = await connection_1.db
        .select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
        nickname: Student_1.Student.nickname,
        email: Student_1.Student.email,
    })
        .from(Session_1.sessionUsers)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, Student_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
    (0, response_1.SuccessResponse)(res, {
        ...session,
        users: users.map(u => ({
            value: u.id,
            label: `${u.firstname} ${u.lastname}`,
            nickname: u.nickname,
            email: u.email
        }))
    });
};
exports.getSessionById = getSessionById;
// تحديث Session (مع الـ Users)
const updateSession = async (req, res) => {
    const { id } = req.params;
    const { name, sessionDate, timeFrom, timeTo, categoryId, courseId, lessonId, lessonName, type, groupId, teacherId, session_link, material_link, teacher_material_link, userIds } = req.body;
    await connection_1.db.update(Session_1.sessions)
        .set({
        name,
        sessionDate,
        timeFrom,
        timeTo,
        categoryId,
        courseId,
        lessonId,
        lessonName,
        type,
        groupId: type === "group" ? groupId : null,
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
        updatedAt: new Date()
    })
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
    // تحديث الـ Users
    if (userIds !== undefined) {
        await connection_1.db.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
        if (userIds.length > 0) {
            const sessionUserRecords = userIds.map((userId) => ({
                sessionId: id,
                studentId: userId
            }));
            await connection_1.db.insert(Session_1.sessionUsers).values(sessionUserRecords);
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Session updated successfully" });
};
exports.updateSession = updateSession;
// حذف Session
const deleteSession = async (req, res) => {
    const { id } = req.params;
    await connection_1.db.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
    await connection_1.db.delete(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Session deleted successfully" });
};
exports.deleteSession = deleteSession;
