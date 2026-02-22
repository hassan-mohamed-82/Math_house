"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.updateNotification = exports.getNotificationById = exports.getAllNotifications = exports.createNotification = exports.searchTeachers = exports.searchStudents = exports.searchParents = exports.selectOptions = void 0;
const connection_1 = require("../../models/connection");
const Notfication_1 = require("../../models/schema/admin/Notfication");
const Student_1 = require("../../models/schema/admin/Student");
const teacher_1 = require("../../models/schema/admin/teacher");
const parent_1 = require("../../models/schema/admin/parent");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const promises_1 = __importDefault(require("fs/promises"));
// ===================== FILE UPLOAD HELPER =====================
const saveUploadedFile = async (req, file) => {
    const ext = path_1.default.extname(file.originalname) || '.bin';
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const rootDir = path_1.default.resolve(__dirname, "../../");
    const uploadsDir = path_1.default.join(rootDir, "uploads", "notifications");
    await promises_1.default.mkdir(uploadsDir, { recursive: true });
    await promises_1.default.writeFile(path_1.default.join(uploadsDir, fileName), file.buffer);
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    return `${protocol}://${req.get("host")}/uploads/notifications/${fileName}`;
};
// ===================== SELECT OPTIONS =====================
const selectOptions = async (req, res) => {
    const [parentsList, studentsList, teachersList] = await Promise.all([
        connection_1.db.select({
            id: parent_1.parents.id,
            name: parent_1.parents.name,
            phoneNumber: parent_1.parents.phoneNumber,
        }).from(parent_1.parents),
        connection_1.db.select({
            id: Student_1.Student.id,
            firstname: Student_1.Student.firstname,
            lastname: Student_1.Student.lastname,
            nickname: Student_1.Student.nickname,
        }).from(Student_1.Student),
        connection_1.db.select({
            id: teacher_1.teachers.id,
            name: teacher_1.teachers.name,
        }).from(teacher_1.teachers),
    ]);
    (0, response_1.SuccessResponse)(res, {
        parents: parentsList.map(p => ({
            value: p.id,
            label: p.name,
            phone: p.phoneNumber
        })),
        students: studentsList.map(s => ({
            value: s.id,
            label: `${s.firstname} ${s.lastname} (${s.nickname})`
        })),
        teachers: teachersList.map(t => ({
            value: t.id,
            label: t.name
        })),
    });
};
exports.selectOptions = selectOptions;
// البحث في الـ Parents
const searchParents = async (req, res) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;
    const parentsList = await connection_1.db
        .select({
        id: parent_1.parents.id,
        name: parent_1.parents.name,
        phoneNumber: parent_1.parents.phoneNumber,
    })
        .from(parent_1.parents)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(parent_1.parents.name, searchTerm), (0, drizzle_orm_1.like)(parent_1.parents.phoneNumber, searchTerm)))
        .limit(20);
    (0, response_1.SuccessResponse)(res, parentsList.map(p => ({
        value: p.id,
        label: p.name,
        phone: p.phoneNumber
    })));
};
exports.searchParents = searchParents;
// البحث في الـ Students
const searchStudents = async (req, res) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;
    const studentsList = await connection_1.db
        .select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
        nickname: Student_1.Student.nickname,
    })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(Student_1.Student.firstname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.lastname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.nickname, searchTerm)))
        .limit(20);
    (0, response_1.SuccessResponse)(res, studentsList.map(s => ({
        value: s.id,
        label: `${s.firstname} ${s.lastname} (${s.nickname})`
    })));
};
exports.searchStudents = searchStudents;
// البحث في الـ Teachers
const searchTeachers = async (req, res) => {
    const { q } = req.query;
    const searchTerm = `%${q || ""}%`;
    const teachersList = await connection_1.db
        .select({
        id: teacher_1.teachers.id,
        name: teacher_1.teachers.name,
    })
        .from(teacher_1.teachers)
        .where((0, drizzle_orm_1.like)(teacher_1.teachers.name, searchTerm))
        .limit(20);
    (0, response_1.SuccessResponse)(res, teachersList.map(t => ({
        value: t.id,
        label: t.name
    })));
};
exports.searchTeachers = searchTeachers;
// ===================== NOTIFICATIONS CRUD =====================
const createNotification = async (req, res) => {
    const { materialLink, dateTime, notification, sendToAll, parentIds, // Array of parent IDs
    studentIds, // Array of student IDs
    teacherIds // Array of teacher IDs
     } = req.body;
    // Handle file upload
    const materialFile = req.file ? await saveUploadedFile(req, req.file) : null;
    if (!dateTime || !notification) {
        throw new BadRequest_1.BadRequest("Date time and notification are required");
    }
    // لازم يختار حد أو يبعت للكل
    if (!sendToAll &&
        (!parentIds || parentIds.length === 0) &&
        (!studentIds || studentIds.length === 0) &&
        (!teacherIds || teacherIds.length === 0)) {
        throw new BadRequest_1.BadRequest("Please select at least one recipient or send to all");
    }
    const notificationId = (0, uuid_1.v4)();
    // إنشاء الـ Notification
    await connection_1.db.insert(Notfication_1.notifications).values({
        id: notificationId,
        materialLink,
        materialFile,
        dateTime: new Date(dateTime),
        notification,
        sendToAll: sendToAll || false
    });
    // لو sendToAll = true، نضيف كل الـ Parents و Students و Teachers
    if (sendToAll) {
        // جلب كل الـ Parents
        const allParents = await connection_1.db.select({ id: parent_1.parents.id }).from(parent_1.parents);
        if (allParents.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationParents).values(allParents.map(p => ({
                notificationId,
                parentId: p.id
            })));
        }
        // جلب كل الـ Students
        const allStudents = await connection_1.db.select({ id: Student_1.Student.id }).from(Student_1.Student);
        if (allStudents.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationStudents).values(allStudents.map(s => ({
                notificationId,
                studentId: s.id
            })));
        }
        // جلب كل الـ Teachers
        const allTeachers = await connection_1.db.select({ id: teacher_1.teachers.id }).from(teacher_1.teachers);
        if (allTeachers.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationTeachers).values(allTeachers.map(t => ({
                notificationId,
                teacherId: t.id
            })));
        }
    }
    else {
        // إضافة الـ Parents المحددين
        if (parentIds && parentIds.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationParents).values(parentIds.map((parentId) => ({
                notificationId,
                parentId
            })));
        }
        // إضافة الـ Students المحددين
        if (studentIds && studentIds.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationStudents).values(studentIds.map((studentId) => ({
                notificationId,
                studentId
            })));
        }
        // إضافة الـ Teachers المحددين
        if (teacherIds && teacherIds.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationTeachers).values(teacherIds.map((teacherId) => ({
                notificationId,
                teacherId
            })));
        }
    }
    (0, response_1.SuccessResponse)(res, { id: notificationId }, 201);
};
exports.createNotification = createNotification;
const getAllNotifications = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const notificationsList = await connection_1.db
        .select({
        id: Notfication_1.notifications.id,
        materialLink: Notfication_1.notifications.materialLink,
        materialFile: Notfication_1.notifications.materialFile,
        dateTime: Notfication_1.notifications.dateTime,
        notification: Notfication_1.notifications.notification,
        sendToAll: Notfication_1.notifications.sendToAll,
        createdAt: Notfication_1.notifications.createdAt,
    })
        .from(Notfication_1.notifications)
        .orderBy((0, drizzle_orm_1.desc)(Notfication_1.notifications.createdAt))
        .limit(Number(limit))
        .offset(offset);
    // Format time
    const formattedNotifications = notificationsList.map(n => ({
        ...n,
        time: n.dateTime ? new Date(n.dateTime).toLocaleTimeString('en-US', { hour12: false }) : '00:00:00',
        text: n.notification.substring(0, 50) + (n.notification.length > 50 ? '...' : '')
    }));
    (0, response_1.SuccessResponse)(res, formattedNotifications);
};
exports.getAllNotifications = getAllNotifications;
const getNotificationById = async (req, res) => {
    const { id } = req.params;
    const [notification] = await connection_1.db
        .select()
        .from(Notfication_1.notifications)
        .where((0, drizzle_orm_1.eq)(Notfication_1.notifications.id, id));
    if (!notification) {
        throw new Errors_1.NotFound("Notification not found");
    }
    // جلب الـ Parents
    const notifParents = await connection_1.db
        .select({
        id: parent_1.parents.id,
        name: parent_1.parents.name,
    })
        .from(Notfication_1.notificationParents)
        .innerJoin(parent_1.parents, (0, drizzle_orm_1.eq)(Notfication_1.notificationParents.parentId, parent_1.parents.id))
        .where((0, drizzle_orm_1.eq)(Notfication_1.notificationParents.notificationId, id));
    // جلب الـ Students
    const notifStudents = await connection_1.db
        .select({
        id: Student_1.Student.id,
        firstname: Student_1.Student.firstname,
        lastname: Student_1.Student.lastname,
        nickname: Student_1.Student.nickname,
    })
        .from(Notfication_1.notificationStudents)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(Notfication_1.notificationStudents.studentId, Student_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Notfication_1.notificationStudents.notificationId, id));
    // جلب الـ Teachers
    const notifTeachers = await connection_1.db
        .select({
        id: teacher_1.teachers.id,
        name: teacher_1.teachers.name,
    })
        .from(Notfication_1.notificationTeachers)
        .innerJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Notfication_1.notificationTeachers.teacherId, teacher_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(Notfication_1.notificationTeachers.notificationId, id));
    (0, response_1.SuccessResponse)(res, {
        ...notification,
        parents: notifParents.map(p => ({
            value: p.id,
            label: p.name
        })),
        students: notifStudents.map(s => ({
            value: s.id,
            label: `${s.firstname} ${s.lastname} (${s.nickname})`
        })),
        teachers: notifTeachers.map(t => ({
            value: t.id,
            label: t.name
        }))
    });
};
exports.getNotificationById = getNotificationById;
const updateNotification = async (req, res) => {
    const { id } = req.params;
    const { materialLink, dateTime, notification, sendToAll, parentIds, studentIds, teacherIds } = req.body;
    const materialFile = req.file ? await saveUploadedFile(req, req.file) : undefined;
    // تحديث الـ Notification
    const updateData = {
        materialLink,
        dateTime: new Date(dateTime),
        notification,
        sendToAll: sendToAll || false,
        updatedAt: new Date()
    };
    if (materialFile) {
        updateData.materialFile = materialFile;
    }
    await connection_1.db.update(Notfication_1.notifications)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(Notfication_1.notifications.id, id));
    // حذف الـ Recipients القدام
    await connection_1.db.delete(Notfication_1.notificationParents).where((0, drizzle_orm_1.eq)(Notfication_1.notificationParents.notificationId, id));
    await connection_1.db.delete(Notfication_1.notificationStudents).where((0, drizzle_orm_1.eq)(Notfication_1.notificationStudents.notificationId, id));
    await connection_1.db.delete(Notfication_1.notificationTeachers).where((0, drizzle_orm_1.eq)(Notfication_1.notificationTeachers.notificationId, id));
    // إضافة الـ Recipients الجدد
    if (sendToAll) {
        const allParents = await connection_1.db.select({ id: parent_1.parents.id }).from(parent_1.parents);
        if (allParents.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationParents).values(allParents.map(p => ({ notificationId: id, parentId: p.id })));
        }
        const allStudents = await connection_1.db.select({ id: Student_1.Student.id }).from(Student_1.Student);
        if (allStudents.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationStudents).values(allStudents.map(s => ({ notificationId: id, studentId: s.id })));
        }
        const allTeachers = await connection_1.db.select({ id: teacher_1.teachers.id }).from(teacher_1.teachers);
        if (allTeachers.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationTeachers).values(allTeachers.map(t => ({ notificationId: id, teacherId: t.id })));
        }
    }
    else {
        if (parentIds && parentIds.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationParents).values(parentIds.map((parentId) => ({ notificationId: id, parentId })));
        }
        if (studentIds && studentIds.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationStudents).values(studentIds.map((studentId) => ({ notificationId: id, studentId })));
        }
        if (teacherIds && teacherIds.length > 0) {
            await connection_1.db.insert(Notfication_1.notificationTeachers).values(teacherIds.map((teacherId) => ({ notificationId: id, teacherId })));
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Notification updated successfully" });
};
exports.updateNotification = updateNotification;
const deleteNotification = async (req, res) => {
    const { id } = req.params;
    // حذف الـ Recipients أولاً
    await connection_1.db.delete(Notfication_1.notificationParents).where((0, drizzle_orm_1.eq)(Notfication_1.notificationParents.notificationId, id));
    await connection_1.db.delete(Notfication_1.notificationStudents).where((0, drizzle_orm_1.eq)(Notfication_1.notificationStudents.notificationId, id));
    await connection_1.db.delete(Notfication_1.notificationTeachers).where((0, drizzle_orm_1.eq)(Notfication_1.notificationTeachers.notificationId, id));
    // حذف الـ Notification
    await connection_1.db.delete(Notfication_1.notifications).where((0, drizzle_orm_1.eq)(Notfication_1.notifications.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Notification deleted successfully" });
};
exports.deleteNotification = deleteNotification;
