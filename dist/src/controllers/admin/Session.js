"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSession = exports.updateSession = exports.getSessionById = exports.getAllSessions = exports.createSession = exports.selectGroups = exports.selectTeachers = exports.selectStudents = exports.selectLesson = exports.selectChapter = exports.selectCourse = exports.selectCategory = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const Session_1 = require("../../models/schema/admin/Session");
const Groups_1 = require("../../models/schema/admin/Groups");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
// Selections
const selectCategory = async (req, res) => {
    const allCategories = await connection_1.db.select({
        id: schema_1.category.id,
        name: schema_1.category.name,
        parentCategoryId: schema_1.category.parentCategoryId,
    }).from(schema_1.category);
    const categoryMap = new Map();
    const parentIds = new Set();
    allCategories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.parentCategoryId) {
            parentIds.add(cat.parentCategoryId);
        }
    });
    const leafCategories = allCategories.filter(cat => !parentIds.has(cat.id));
    const formattedCategories = leafCategories.map(leaf => {
        let current = leaf;
        const ancestors = [];
        while (current) {
            ancestors.unshift(current.name);
            if (current.parentCategoryId && categoryMap.has(current.parentCategoryId)) {
                current = categoryMap.get(current.parentCategoryId);
            }
            else {
                break;
            }
        }
        return {
            id: leaf.id,
            name: ancestors.join(" > "),
            root: ancestors[0] || leaf.name
        };
    });
    const groupedCategories = formattedCategories.reduce((acc, curr) => {
        const { root, ...rest } = curr;
        if (!acc[root]) {
            acc[root] = [];
        }
        acc[root].push(rest);
        return acc;
    }, {});
    const result = Object.keys(groupedCategories).map(key => ({
        root: key,
        children: groupedCategories[key]
    }));
    return (0, response_1.SuccessResponse)(res, { categories: result });
};
exports.selectCategory = selectCategory;
const selectCourse = async (req, res) => {
    const coursesList = await connection_1.db.select({
        id: schema_1.courses.id,
        name: schema_1.courses.name,
        categoryId: schema_1.courses.categoryId,
    }).from(schema_1.courses).where((0, drizzle_orm_1.eq)(schema_1.courses.categoryId, req.params.categoryId));
    return (0, response_1.SuccessResponse)(res, { courses: coursesList });
};
exports.selectCourse = selectCourse;
const selectChapter = async (req, res) => {
    const { courseId } = req.params;
    const chaptersList = await connection_1.db.select({
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
    }).from(schema_1.chapters).where((0, drizzle_orm_1.eq)(schema_1.chapters.courseId, courseId));
    return (0, response_1.SuccessResponse)(res, { chapters: chaptersList });
};
exports.selectChapter = selectChapter;
const selectLesson = async (req, res) => {
    const lessonsList = await connection_1.db.select({
        id: schema_1.lessons.id,
        name: schema_1.lessons.name,
    }).from(schema_1.lessons).where((0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, req.params.chapterId));
    return (0, response_1.SuccessResponse)(res, { lessons: lessonsList });
};
exports.selectLesson = selectLesson;
const selectStudents = async (req, res) => {
    const { grade, categoryId, search } = req.query;
    const conditions = [];
    if (grade) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.Student.grade, grade));
    }
    if (categoryId) {
        conditions.push((0, drizzle_orm_1.eq)(schema_1.Student.category, categoryId));
    }
    if (search) {
        const d_search = search;
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.Student.firstname, `%${d_search}%`), (0, drizzle_orm_1.like)(schema_1.Student.lastname, `%${d_search}%`), (0, drizzle_orm_1.like)(schema_1.Student.email, `%${d_search}%`), (0, drizzle_orm_1.like)(schema_1.Student.phone, `%${d_search}%`)));
    }
    const studentsList = await connection_1.db.select({
        id: schema_1.Student.id,
        name: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("name"),
    })
        .from(schema_1.Student)
        .where(conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined);
    return (0, response_1.SuccessResponse)(res, { students: studentsList });
};
exports.selectStudents = selectStudents;
const selectTeachers = async (req, res) => {
    const teachersList = await connection_1.db.select({
        id: schema_1.teachers.id,
        name: schema_1.teachers.name,
    }).from(schema_1.teachers).orderBy((0, drizzle_orm_1.asc)(schema_1.teachers.name));
    return (0, response_1.SuccessResponse)(res, { teachers: teachersList });
};
exports.selectTeachers = selectTeachers;
const selectGroups = async (req, res) => {
    const groupsList = await connection_1.db.select({
        id: Groups_1.groups.id,
        name: Groups_1.groups.name,
    }).from(Groups_1.groups).orderBy((0, drizzle_orm_1.asc)(Groups_1.groups.name));
    return (0, response_1.SuccessResponse)(res, { groups: groupsList });
};
exports.selectGroups = selectGroups;
const createSession = async (req, res) => {
    const { name, sessionDate, timeFrom, timeTo, type, groupId, teacherId, session_link, material_link, teacher_material_link, sessionRelationalType, lessonIds, studentIds } = req.body;
    if (!name ||
        !sessionDate ||
        !timeFrom ||
        !timeTo ||
        !type ||
        !teacherId ||
        !session_link ||
        !sessionRelationalType ||
        !lessonIds ||
        !Array.isArray(lessonIds) ||
        lessonIds.length === 0) {
        throw new BadRequest_1.BadRequest("Missing or invalid required fields");
    }
    // Time Validations
    if (new Date(`${sessionDate}T${timeFrom}`) >= new Date(`${sessionDate}T${timeTo}`)) {
        throw new BadRequest_1.BadRequest("timeFrom must be before timeTo");
    }
    // Validations
    const teacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId)).limit(1);
    if (teacher.length === 0) {
        throw new BadRequest_1.BadRequest("Teacher not found");
    }
    const lessonsList = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
    if (lessonsList.length !== lessonIds.length) {
        throw new BadRequest_1.BadRequest("One or more lessons not found");
    }
    const sessionId = (0, crypto_1.randomUUID)();
    const lessonInserts = lessonIds.map((lessonId) => ({
        id: (0, crypto_1.randomUUID)(),
        sessionId,
        lessonId,
    }));
    switch (type) {
        case "private":
            if (!Array.isArray(studentIds) || studentIds.length !== 1) {
                throw new BadRequest_1.BadRequest("Private sessions must have exactly one student");
            }
            const student = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, studentIds[0])).limit(1);
            if (student.length === 0) {
                throw new BadRequest_1.BadRequest("Student not found");
            }
            await connection_1.db.transaction(async (tx) => {
                await tx.insert(Session_1.sessions).values({
                    id: sessionId,
                    name,
                    sessionDate,
                    timeFrom,
                    timeTo,
                    type,
                    teacherId,
                    session_link,
                    material_link,
                    teacher_material_link,
                    sessionRelationalType,
                });
                await tx.insert(Session_1.sessionUsers).values({
                    id: (0, crypto_1.randomUUID)(),
                    sessionId,
                    studentId: studentIds[0],
                });
                // Bulk insert session lessons
                await tx.insert(schema_1.sessionLessons).values(lessonInserts);
            });
            return (0, response_1.SuccessResponse)(res, { message: "Private session created successfully" }, 201);
        case "group":
            if (!groupId) {
                throw new BadRequest_1.BadRequest("Group sessions must have a groupId");
            }
            const group = await connection_1.db.select().from(Groups_1.groups).where((0, drizzle_orm_1.eq)(Groups_1.groups.id, groupId)).limit(1);
            if (group.length === 0) {
                throw new BadRequest_1.BadRequest("Group not found");
            }
            const groupStudentsList = await connection_1.db.select({ studentId: Groups_1.groupStudents.studentId })
                .from(Groups_1.groupStudents)
                .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, groupId));
            // Merge group students with explicitly provided studentIds
            const uniqueStudentIds = new Set(groupStudentsList.map(gs => gs.studentId));
            if (Array.isArray(studentIds)) {
                studentIds.forEach(id => uniqueStudentIds.add(id));
            }
            const sessionUsersInserts = Array.from(uniqueStudentIds).map(id => ({
                id: (0, crypto_1.randomUUID)(),
                sessionId,
                studentId: id,
            }));
            await connection_1.db.transaction(async (tx) => {
                await tx.insert(Session_1.sessions).values({
                    id: sessionId,
                    name,
                    sessionDate,
                    timeFrom,
                    timeTo,
                    type,
                    groupId,
                    teacherId,
                    session_link,
                    material_link,
                    teacher_material_link,
                    sessionRelationalType,
                });
                if (sessionUsersInserts.length > 0) {
                    await tx.insert(Session_1.sessionUsers).values(sessionUsersInserts);
                }
                // Bulk insert session lessons
                await tx.insert(schema_1.sessionLessons).values(lessonInserts);
            });
            return (0, response_1.SuccessResponse)(res, { message: "Group session created successfully" }, 201);
        default:
            throw new BadRequest_1.BadRequest("Invalid session type");
    }
};
exports.createSession = createSession;
const getAllSessions = async (req, res) => {
    const sessionsList = await connection_1.db.select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        type: Session_1.sessions.type,
        groupId: Session_1.sessions.groupId,
        teacherId: Session_1.sessions.teacherId,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        createdAt: Session_1.sessions.createdAt,
        updatedAt: Session_1.sessions.updatedAt,
        groups: {
            id: Groups_1.groups.id,
            name: Groups_1.groups.name,
        },
        teacher: {
            id: schema_1.teachers.id,
            name: schema_1.teachers.name,
        }
    })
        .from(Session_1.sessions)
        .leftJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessions.groupId, Groups_1.groups.id))
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, schema_1.teachers.id));
    return (0, response_1.SuccessResponse)(res, { sessions: sessionsList }, 200);
};
exports.getAllSessions = getAllSessions;
const getSessionById = async (req, res) => {
    const { id } = req.params;
    const session = await connection_1.db.select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        type: Session_1.sessions.type,
        groupId: Session_1.sessions.groupId,
        teacherId: Session_1.sessions.teacherId,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        createdAt: Session_1.sessions.createdAt,
        updatedAt: Session_1.sessions.updatedAt,
        groups: {
            id: Groups_1.groups.id,
            name: Groups_1.groups.name,
        },
        teacher: {
            id: schema_1.teachers.id,
            name: schema_1.teachers.name,
        },
    }).from(Session_1.sessions)
        .leftJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessions.groupId, Groups_1.groups.id))
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id)).limit(1);
    if (!session[0]) {
        throw new Errors_1.NotFound("Session not found");
    }
    const sessionLessonsData = await connection_1.db.select({
        id: schema_1.lessons.id,
        name: schema_1.lessons.name,
        chapter: {
            id: schema_1.chapters.id,
            name: schema_1.chapters.name,
        },
        course: {
            id: schema_1.courses.id,
            name: schema_1.courses.name,
        },
        category: {
            id: schema_1.category.id,
            name: schema_1.category.name,
        }
    })
        .from(schema_1.sessionLessons)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.sessionLessons.lessonId, schema_1.lessons.id))
        .innerJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
        .innerJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id));
    const sessionStudentsData = await connection_1.db.select({
        id: schema_1.Student.id,
        name: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("name"),
    })
        .from(Session_1.sessionUsers)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
    const responseData = {
        ...session[0],
        lessons: sessionLessonsData,
        students: sessionStudentsData
    };
    return (0, response_1.SuccessResponse)(res, { session: responseData }, 200);
};
exports.getSessionById = getSessionById;
const updateSession = async (req, res) => {
    const { id } = req.params;
    const { name, sessionDate, timeFrom, timeTo, teacherId, session_link, material_link, teacher_material_link, lessonIds, studentIds } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Session ID is required");
    }
    const sessionExists = await connection_1.db.select().from(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id)).limit(1);
    if (sessionExists.length === 0) {
        throw new Errors_1.NotFound("Session not found");
    }
    const currentSession = sessionExists[0];
    // Validate Teacher
    if (teacherId) {
        const teacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId)).limit(1);
        if (teacher.length === 0) {
            throw new BadRequest_1.BadRequest("Teacher not found");
        }
    }
    // Validate Lessons
    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
        const lessonsList = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
        if (lessonsList.length !== lessonIds.length) {
            throw new BadRequest_1.BadRequest("One or more lessons not found");
        }
    }
    // Validate Time
    const newSessionDate = sessionDate || currentSession.sessionDate;
    const newTimeFrom = timeFrom || currentSession.timeFrom;
    const newTimeTo = timeTo || currentSession.timeTo;
    if (new Date(`${newSessionDate}T${newTimeFrom}`) >= new Date(`${newSessionDate}T${newTimeTo}`)) {
        throw new BadRequest_1.BadRequest("timeFrom must be before timeTo");
    }
    await connection_1.db.transaction(async (tx) => {
        // Update basic session details
        await tx.update(Session_1.sessions)
            .set({
            ...(name && { name }),
            ...(sessionDate && { sessionDate }),
            ...(timeFrom && { timeFrom }),
            ...(timeTo && { timeTo }),
            ...(teacherId && { teacherId }),
            ...(session_link && { session_link }),
            ...(material_link && { material_link }),
            ...(teacher_material_link && { teacher_material_link }),
        })
            .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
        // Update Lessons
        if (lessonIds && Array.isArray(lessonIds)) {
            // Remove existing
            await tx.delete(schema_1.sessionLessons).where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id));
            // Insert new ones
            if (lessonIds.length > 0) {
                const lessonInserts = lessonIds.map((lessonId) => ({
                    id: (0, crypto_1.randomUUID)(),
                    sessionId: id,
                    lessonId,
                }));
                await tx.insert(schema_1.sessionLessons).values(lessonInserts);
            }
        }
        // Update Students (Merging logic based on session type)
        if (studentIds && Array.isArray(studentIds)) {
            if (currentSession.type === "private" && studentIds.length !== 1) {
                throw new BadRequest_1.BadRequest("Private sessions must have exactly one student");
            }
            // Verify students exist
            if (studentIds.length > 0) {
                const studentsList = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.inArray)(schema_1.Student.id, studentIds));
                if (studentsList.length !== studentIds.length) {
                    throw new BadRequest_1.BadRequest("One or more students not found");
                }
            }
            let finalStudentIds = [...studentIds];
            if (currentSession.type === "group" && currentSession.groupId) {
                // Ensure group students are always included and not accidentally removed
                const groupStudentsList = await tx.select({ studentId: Groups_1.groupStudents.studentId })
                    .from(Groups_1.groupStudents)
                    .where((0, drizzle_orm_1.eq)(Groups_1.groupStudents.groupId, currentSession.groupId));
                const uniqueStudentIds = new Set(groupStudentsList.map(gs => gs.studentId));
                studentIds.forEach(studentId => uniqueStudentIds.add(studentId));
                finalStudentIds = Array.from(uniqueStudentIds);
            }
            // Remove existing session users related to this session
            await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
            // Insert new merged list
            if (finalStudentIds.length > 0) {
                const sessionUsersInserts = finalStudentIds.map(studentId => ({
                    id: (0, crypto_1.randomUUID)(),
                    sessionId: id,
                    studentId,
                }));
                await tx.insert(Session_1.sessionUsers).values(sessionUsersInserts);
            }
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Session updated successfully" }, 200);
};
exports.updateSession = updateSession;
const deleteSession = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Session ID is required");
    }
    const sessionExists = await connection_1.db.select().from(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id)).limit(1);
    if (sessionExists.length === 0) {
        throw new Errors_1.NotFound("Session not found");
    }
    await connection_1.db.transaction(async (tx) => {
        // Delete related entities first due to foreign keys constraints
        await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
        await tx.delete(schema_1.sessionLessons).where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id));
        await tx.delete(Session_1.sessionRatings).where((0, drizzle_orm_1.eq)(Session_1.sessionRatings.sessionId, id));
        await tx.delete(schema_1.sessionAttendance).where((0, drizzle_orm_1.eq)(schema_1.sessionAttendance.sessionId, id));
        // Final delete of the target session
        await tx.delete(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
    });
    return (0, response_1.SuccessResponse)(res, { message: "Session deleted successfully" }, 200);
};
exports.deleteSession = deleteSession;
