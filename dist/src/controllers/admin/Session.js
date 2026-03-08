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
const selectOptions = async (req, res) => {
    const [groupsList, teachersList, categoriesList, coursesList] = await Promise.all([
        connection_1.db.select({ id: Groups_1.groups.id, name: Groups_1.groups.name }).from(Groups_1.groups).where((0, drizzle_orm_1.eq)(Groups_1.groups.isActive, true)),
        connection_1.db.select({ id: teacher_1.teachers.id, name: teacher_1.teachers.name }).from(teacher_1.teachers),
        connection_1.db.select({ id: category_1.category.id, name: category_1.category.name }).from(category_1.category),
        connection_1.db.select({ id: courses_1.courses.id, name: courses_1.courses.name, categoryId: courses_1.courses.categoryId }).from(courses_1.courses),
    ]);
    (0, response_1.SuccessResponse)(res, {
        groups: groupsList.map(g => ({ value: g.id, label: g.name })),
        teachers: teachersList.map(t => ({ value: t.id, label: t.name })),
        categories: categoriesList.map(c => ({ value: c.id, label: c.name })),
        courses: coursesList.map(c => ({ value: c.id, label: c.name, categoryId: c.categoryId })),
    });
};
exports.selectOptions = selectOptions;
// ===================== USERS APIs =====================
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
const createSession = async (req, res) => {
    const { name, sessionDate, timeFrom, timeTo, categoryId, courseId, lessonId, lessonName, type, groupId, teacherId, session_link, material_link, teacher_material_link, userIds } = req.body;
    // Validation for NOT NULL fields
    if (!name || !sessionDate || !timeFrom || !timeTo || !type || !teacherId || !categoryId || !courseId || !session_link) {
        throw new BadRequest_1.BadRequest("Missing required fields (Check categoryId, courseId, or session_link)");
    }
    const sessionId = (0, crypto_1.randomUUID)();
    await connection_1.db.transaction(async (tx) => {
        // 1. إنشاء الـ Object الأساسي بالحقول الإجبارية فقط
        const newSessionData = {
            id: sessionId,
            name: name.trim(),
            sessionDate: new Date(sessionDate).toISOString().split('T')[0],
            timeFrom,
            timeTo,
            categoryId,
            courseId,
            type,
            teacherId,
            session_link,
        };
        // 2. حقن الحقول الاختيارية ديناميكياً فقط في حال وجودها وكانت غير فارغة
        if (lessonId && lessonId.trim() !== "")
            newSessionData.lessonId = lessonId.trim();
        if (lessonName && lessonName.trim() !== "")
            newSessionData.lessonName = lessonName.trim();
        if (type === "group" && groupId && groupId.trim() !== "")
            newSessionData.groupId = groupId.trim();
        if (material_link && material_link.trim() !== "")
            newSessionData.material_link = material_link.trim();
        if (teacher_material_link && teacher_material_link.trim() !== "")
            newSessionData.teacher_material_link = teacher_material_link.trim();
        // 3. التنفيذ
        await tx.insert(Session_1.sessions).values(newSessionData);
        let finalUserIds = userIds || [];
        if (type === "group" && groupId && finalUserIds.length === 0) {
            const groupUsersList = await tx
                .select({ studentId: Groups_1.groupStudents.studentId })
                .from(Groups_1.groupStudents)
                .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, groupId));
            finalUserIds = groupUsersList.map(u => u.studentId);
        }
        if (finalUserIds.length > 0) {
            const sessionUserRecords = finalUserIds.map((uId) => ({
                sessionId: sessionId,
                studentId: uId
            }));
            await tx.insert(Session_1.sessionUsers).values(sessionUserRecords);
        }
    });
    (0, response_1.SuccessResponse)(res, { id: sessionId }, 201);
};
exports.createSession = createSession;
const getAllSessions = async (req, res) => {
    const { page = 1, limit = 10, date, type, teacherId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const conditions = [];
    if (date)
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.sessionDate, new Date(date)));
    if (type)
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.type, type));
    if (teacherId)
        conditions.push((0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacherId));
    const sessionsList = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        categoryName: category_1.category.name,
        courseName: courses_1.courses.name,
        lessonName: Session_1.sessions.lessonName,
        type: Session_1.sessions.type,
        groupName: Groups_1.groups.name,
        teacherName: teacher_1.teachers.name,
        session_link: Session_1.sessions.session_link,
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
        courseId: Session_1.sessions.courseId,
        lessonId: Session_1.sessions.lessonId,
        lessonName: Session_1.sessions.lessonName,
        type: Session_1.sessions.type,
        groupId: Session_1.sessions.groupId,
        teacherId: Session_1.sessions.teacherId,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
    })
        .from(Session_1.sessions)
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
    if (!session)
        throw new Errors_1.NotFound("Session not found");
    const users = await connection_1.db
        .select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
    })
        .from(Session_1.sessionUsers)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, Student_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
    (0, response_1.SuccessResponse)(res, {
        ...session,
        users: users.map(u => ({ value: u.id, label: `${u.firstname} ${u.lastname}` }))
    });
};
exports.getSessionById = getSessionById;
const updateSession = async (req, res) => {
    const { id } = req.params;
    const { userIds, ...data } = req.body;
    await connection_1.db.transaction(async (tx) => {
        // تجهيز بيانات التحديث
        const updateData = { ...data, updatedAt: new Date() };
        // تنظيف البيانات: إذا تم إرسال حقول اختيارية فارغة، نقوم بحذفها من الكائن
        // لمنع Drizzle من محاولة إدخال قيمة فارغة في حقول لا تقبلها
        if (updateData.lessonId !== undefined && updateData.lessonId.trim() === "")
            delete updateData.lessonId;
        if (updateData.lessonName !== undefined && updateData.lessonName.trim() === "")
            delete updateData.lessonName;
        if (updateData.groupId !== undefined && updateData.groupId.trim() === "")
            delete updateData.groupId;
        if (updateData.material_link !== undefined && updateData.material_link.trim() === "")
            delete updateData.material_link;
        if (updateData.teacher_material_link !== undefined && updateData.teacher_material_link.trim() === "")
            delete updateData.teacher_material_link;
        await tx.update(Session_1.sessions)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
        if (userIds !== undefined) {
            await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
            if (userIds.length > 0) {
                const records = userIds.map((uId) => ({ sessionId: id, studentId: uId }));
                await tx.insert(Session_1.sessionUsers).values(records);
            }
        }
    });
    (0, response_1.SuccessResponse)(res, { message: "Session updated successfully" });
};
exports.updateSession = updateSession;
const deleteSession = async (req, res) => {
    const { id } = req.params;
    await connection_1.db.transaction(async (tx) => {
        await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
        await tx.delete(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
    });
    (0, response_1.SuccessResponse)(res, { message: "Session deleted successfully" });
};
exports.deleteSession = deleteSession;
