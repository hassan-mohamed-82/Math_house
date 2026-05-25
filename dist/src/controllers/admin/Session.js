"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSession = exports.updateSession = exports.getSessionById = exports.getAllSessions = exports.createSession = exports.selectGroups = exports.selectTeachers = exports.selectStudents = exports.selectLesson = exports.selectChapter = exports.selectCourse = exports.selectSubCategory = exports.selectCategory = void 0;
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
const selectSubCategory = async (req, res) => {
    const { categoryId } = req.params;
    const parentCat = await connection_1.db
        .select({ id: schema_1.category.id })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId))
        .limit(1);
    if (parentCat.length === 0)
        throw new BadRequest_1.BadRequest("Category not found");
    const subCategories = await connection_1.db
        .select({ id: schema_1.category.id, name: schema_1.category.name })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, categoryId));
    return (0, response_1.SuccessResponse)(res, { subCategories });
};
exports.selectSubCategory = selectSubCategory;
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
// كائن تحويل الأسماء النصية للأيام إلى الأرقام المقابلة لها في JavaScript
const daysMap = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};
// دالة مساعدة لتوليد التواريخ الموافقة للأيام المطلوبة في حالة التكرار
function getRecurringDates(startDate, endDate, allowedDays) {
    const dates = [];
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        if (allowedDays.includes(current.getDay())) {
            dates.push(current.toISOString().split("T")[0]);
        }
        current.setDate(current.getDate() + 1);
    }
    return dates;
}
const createSession = async (req, res) => {
    const { name, scheduleType, // "once" | "repeat"
    sessionDate, // required when scheduleType === "once"
    timeFrom, // required when scheduleType === "once"
    timeTo, // required when scheduleType === "once"
    startDate, // required when scheduleType === "repeat"
    endDate, // required when scheduleType === "repeat"
    recurringDays, // required when scheduleType === "repeat" -> Array of { dayOfWeek: string, timeFrom: string, timeTo: string }
    groupIds, // string[] – optional
    studentIds, // string[] – optional
    sessionRelationalType, categoryId, // parent category ID
    subCategoryId, // sub-category ID (must be child of categoryId)
    courseId, // course ID (must belong to subCategoryId)
    chapterIds, // string[] – chapters
    lessonIds, // string[] – lessons
    teacherId, session_link, material_link, teacher_material_link, } = req.body;
    // ── 1. Required field presence (General fields) ────────────────────────
    if (!name ||
        !scheduleType ||
        !teacherId ||
        !sessionRelationalType ||
        !categoryId ||
        !subCategoryId ||
        !courseId ||
        !Array.isArray(chapterIds) || chapterIds.length === 0 ||
        !Array.isArray(lessonIds) || lessonIds.length === 0) {
        throw new BadRequest_1.BadRequest("Missing or invalid required fields: name, scheduleType, teacherId, sessionRelationalType, categoryId, subCategoryId, courseId, chapterIds[], lessonIds[]");
    }
    // ── 2. At least groups or students must be provided ───────────────────
    const hasGroups = Array.isArray(groupIds) && groupIds.length > 0;
    const hasStudents = Array.isArray(studentIds) && studentIds.length > 0;
    if (!hasGroups && !hasStudents) {
        throw new BadRequest_1.BadRequest("You must provide at least one group (groupIds[]) or one student (studentIds[])");
    }
    // ── 3. Schedule type and Time validation ───────────────────────────────────────
    if (!["once", "repeat"].includes(scheduleType)) {
        throw new BadRequest_1.BadRequest("scheduleType must be 'once' or 'repeat'");
    }
    // إنشاء مصفوفة لتجهيز التواريخ والأوقات الجاهزة للإنشاء الحقيقي
    let targetSchedules = [];
    if (scheduleType === "once") {
        if (!sessionDate || !timeFrom || !timeTo) {
            throw new BadRequest_1.BadRequest("sessionDate, timeFrom, and timeTo are required for one-time sessions");
        }
        if (new Date(`${sessionDate}T${timeFrom}`) >= new Date(`${sessionDate}T${timeTo}`)) {
            throw new BadRequest_1.BadRequest("timeFrom must be before timeTo");
        }
        targetSchedules.push({ date: sessionDate, from: timeFrom, to: timeTo });
    }
    else {
        if (!startDate || !endDate) {
            throw new BadRequest_1.BadRequest("startDate and endDate are required for recurring sessions");
        }
        if (new Date(startDate) >= new Date(endDate)) {
            throw new BadRequest_1.BadRequest("startDate must be before endDate");
        }
        if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
            throw new BadRequest_1.BadRequest("recurringDays array is required and cannot be empty for recurring sessions");
        }
        // تحويل أسماء الأيام النصية القادمة من الـ Front-end إلى أرقام المقابلة لها
        const allowedDays = recurringDays.map((d) => {
            if (!d.dayOfWeek || typeof d.dayOfWeek !== "string") {
                throw new BadRequest_1.BadRequest("dayOfWeek must be a valid string name (e.g., 'Monday')");
            }
            const dayNum = daysMap[d.dayOfWeek.toLowerCase()];
            if (dayNum === undefined) {
                throw new BadRequest_1.BadRequest(`Invalid day name provided: ${d.dayOfWeek}`);
            }
            return dayNum;
        });
        const generatedDates = getRecurringDates(startDate, endDate, allowedDays);
        // ربط كل تاريخ ناتج بالوقت الخاص باليوم بتاعه المبعوث في الـ body
        generatedDates.forEach((dateStr) => {
            const currentDayNum = new Date(dateStr).getDay();
            const config = recurringDays.find((d) => daysMap[d.dayOfWeek.toLowerCase()] === currentDayNum);
            if (config) {
                targetSchedules.push({ date: dateStr, from: config.timeFrom, to: config.timeTo });
            }
        });
        if (targetSchedules.length === 0) {
            throw new BadRequest_1.BadRequest("No valid session dates could be generated with the provided range and days");
        }
    }
    // ── 4. Teacher validation ─────────────────────────────────────────────
    const teacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId)).limit(1);
    if (teacher.length === 0)
        throw new BadRequest_1.BadRequest("Teacher not found");
    // ── 5. Category hierarchy validation ─────────────────────────────────
    const parentCat = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId)).limit(1);
    if (parentCat.length === 0)
        throw new BadRequest_1.BadRequest("Category not found");
    const subCat = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, subCategoryId)).limit(1);
    if (subCat.length === 0)
        throw new BadRequest_1.BadRequest("Sub-category not found");
    if (subCat[0].parentCategoryId !== categoryId) {
        throw new BadRequest_1.BadRequest("Sub-category does not belong to the selected category");
    }
    // ── 6. Course validation (must belong to subCategoryId) ──────────────
    const course = await connection_1.db
        .select()
        .from(schema_1.courses)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId), (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, subCategoryId)))
        .limit(1);
    if (course.length === 0) {
        throw new BadRequest_1.BadRequest("Course does not belong to the selected sub-category");
    }
    // ── 7. Chapters validation ────────────────────────────────────────────
    const chaptersList = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.inArray)(schema_1.chapters.id, chapterIds));
    if (chaptersList.length !== chapterIds.length) {
        throw new BadRequest_1.BadRequest("One or more chapters not found");
    }
    const invalidChapters = chaptersList.filter(ch => ch.courseId !== courseId || ch.categoryId !== subCategoryId);
    if (invalidChapters.length > 0) {
        throw new BadRequest_1.BadRequest(`Chapters [${invalidChapters.map(c => c.id).join(", ")}] do not belong to the selected course / sub-category`);
    }
    // ── 8. Lessons validation ─────────────────────────────────────────────
    const lessonsList = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
    if (lessonsList.length !== lessonIds.length) {
        throw new BadRequest_1.BadRequest("One or more lessons not found");
    }
    const chapterIdSet = new Set(chapterIds);
    const invalidLessons = lessonsList.filter(l => l.courseId !== courseId || l.categoryId !== subCategoryId || !chapterIdSet.has(l.chapterId));
    if (invalidLessons.length > 0) {
        throw new BadRequest_1.BadRequest(`Lessons [${invalidLessons.map(l => l.id).join(", ")}] do not belong to the selected course / chapters / sub-category`);
    }
    // ── 9. Groups validation ─────────────────────────────────────────────
    if (hasGroups) {
        const groupList = await connection_1.db.select().from(Groups_1.groups).where((0, drizzle_orm_1.inArray)(Groups_1.groups.id, groupIds));
        if (groupList.length !== groupIds.length) {
            throw new BadRequest_1.BadRequest("One or more groups not found");
        }
    }
    // ── 10. Students validation ───────────────────────────────────────────
    if (hasStudents) {
        const studentList = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.inArray)(schema_1.Student.id, studentIds));
        if (studentList.length !== studentIds.length) {
            throw new BadRequest_1.BadRequest("One or more students not found");
        }
    }
    // ── 11. Resolve all student IDs (group students + direct students) ────
    const uniqueStudentIds = new Set(hasStudents ? studentIds : []);
    if (hasGroups) {
        const groupStudentsList = await connection_1.db
            .select({ studentId: Groups_1.groupStudents.studentId })
            .from(Groups_1.groupStudents)
            .where((0, drizzle_orm_1.inArray)(Groups_1.groupStudents.groupId, groupIds));
        groupStudentsList.forEach(gs => uniqueStudentIds.add(gs.studentId));
    }
    // ── 12. Build arrays for Bulk Insertion ───────────────────────────────────
    const sessionsToInsert = [];
    const lessonInserts = [];
    const sessionUsersInserts = [];
    const sessionGroupsInserts = [];
    for (const schedule of targetSchedules) {
        const sessionId = (0, crypto_1.randomUUID)();
        sessionsToInsert.push({
            id: sessionId,
            name: scheduleType === "repeat" ? `${name} (${schedule.date})` : name,
            scheduleType,
            sessionDate: schedule.date,
            startDate: scheduleType === "repeat" ? startDate : null,
            endDate: scheduleType === "repeat" ? endDate : null,
            timeFrom: schedule.from,
            timeTo: schedule.to,
            teacherId,
            session_link: session_link ?? null,
            material_link: material_link ?? null,
            teacher_material_link: teacher_material_link ?? null,
            sessionRelationalType,
        });
        // ربط الدروس بالحصة الحالية
        lessonIds.forEach((lessonId) => {
            lessonInserts.push({
                id: (0, crypto_1.randomUUID)(),
                sessionId,
                lessonId,
            });
        });
        // ربط الطلاب المستهدفين بالحصة الحالية
        Array.from(uniqueStudentIds).forEach((studentId) => {
            sessionUsersInserts.push({
                id: (0, crypto_1.randomUUID)(),
                sessionId,
                studentId,
            });
        });
        // ربط المجموعات المستهدفة بالحصة الحالية
        if (hasGroups) {
            groupIds.forEach((gId) => {
                sessionGroupsInserts.push({
                    id: (0, crypto_1.randomUUID)(),
                    sessionId,
                    groupId: gId,
                });
            });
        }
    }
    // ── 13. Persist everything in one clean transaction ─────────────────────────
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(Session_1.sessions).values(sessionsToInsert);
        if (sessionGroupsInserts.length > 0) {
            await tx.insert(Session_1.sessionGroups).values(sessionGroupsInserts);
        }
        if (sessionUsersInserts.length > 0) {
            await tx.insert(Session_1.sessionUsers).values(sessionUsersInserts);
        }
        await tx.insert(schema_1.sessionLessons).values(lessonInserts);
    });
    return (0, response_1.SuccessResponse)(res, { message: `${sessionsToInsert.length} session(s) created successfully` }, 201);
};
exports.createSession = createSession;
const getAllSessions = async (req, res) => {
    // Fetch base session list with teacher info
    const sessionsList = await connection_1.db.select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        scheduleType: Session_1.sessions.scheduleType,
        sessionDate: Session_1.sessions.sessionDate,
        startDate: Session_1.sessions.startDate,
        endDate: Session_1.sessions.endDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
        createdAt: Session_1.sessions.createdAt,
        updatedAt: Session_1.sessions.updatedAt,
        teacher: {
            id: schema_1.teachers.id,
            name: schema_1.teachers.name,
        },
    })
        .from(Session_1.sessions)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, schema_1.teachers.id))
        .orderBy(Session_1.sessions.createdAt);
    // For each session, attach a lightweight groups + students summary
    const sessionIds = sessionsList.map(s => s.id);
    const groupsSummary = sessionIds.length > 0
        ? await connection_1.db.select({
            sessionId: Session_1.sessionGroups.sessionId,
            groupId: Groups_1.groups.id,
            groupName: Groups_1.groups.name,
        })
            .from(Session_1.sessionGroups)
            .innerJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessionGroups.groupId, Groups_1.groups.id))
            .where((0, drizzle_orm_1.inArray)(Session_1.sessionGroups.sessionId, sessionIds))
        : [];
    const studentsSummary = sessionIds.length > 0
        ? await connection_1.db.select({
            sessionId: Session_1.sessionUsers.sessionId,
            studentId: schema_1.Student.id,
            studentName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("studentName"),
        })
            .from(Session_1.sessionUsers)
            .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, schema_1.Student.id))
            .where((0, drizzle_orm_1.inArray)(Session_1.sessionUsers.sessionId, sessionIds))
        : [];
    // Map summaries by sessionId
    const groupsBySession = new Map();
    groupsSummary.forEach(g => {
        if (!groupsBySession.has(g.sessionId))
            groupsBySession.set(g.sessionId, []);
        groupsBySession.get(g.sessionId).push({ id: g.groupId, name: g.groupName });
    });
    const studentsBySession = new Map();
    studentsSummary.forEach(s => {
        if (!studentsBySession.has(s.sessionId))
            studentsBySession.set(s.sessionId, []);
        studentsBySession.get(s.sessionId).push({ id: s.studentId, name: s.studentName });
    });
    const result = sessionsList.map(session => ({
        ...session,
        groups: groupsBySession.get(session.id) ?? [],
        groupCount: groupsBySession.get(session.id)?.length ?? 0,
        students: studentsBySession.get(session.id) ?? [],
        studentCount: studentsBySession.get(session.id)?.length ?? 0,
    }));
    return (0, response_1.SuccessResponse)(res, { sessions: result }, 200);
};
exports.getAllSessions = getAllSessions;
const getSessionById = async (req, res) => {
    const { id } = req.params;
    const session = await connection_1.db.select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        scheduleType: Session_1.sessions.scheduleType,
        sessionDate: Session_1.sessions.sessionDate,
        startDate: Session_1.sessions.startDate,
        endDate: Session_1.sessions.endDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        teacherId: Session_1.sessions.teacherId,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        createdAt: Session_1.sessions.createdAt,
        updatedAt: Session_1.sessions.updatedAt,
        teacher: {
            id: schema_1.teachers.id,
            name: schema_1.teachers.name,
        },
    })
        .from(Session_1.sessions)
        .leftJoin(schema_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, schema_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id))
        .limit(1);
    if (!session[0]) {
        throw new Errors_1.NotFound("Session not found");
    }
    // Fetch linked groups via junction table
    const sessionGroupsData = await connection_1.db.select({
        id: Groups_1.groups.id,
        name: Groups_1.groups.name,
    })
        .from(Session_1.sessionGroups)
        .innerJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessionGroups.groupId, Groups_1.groups.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessionGroups.sessionId, id));
    // Fetch linked lessons with full academic hierarchy
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
        },
    })
        .from(schema_1.sessionLessons)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.sessionLessons.lessonId, schema_1.lessons.id))
        .innerJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
        .innerJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id));
    // Fetch all students enrolled in this session
    const sessionStudentsData = await connection_1.db.select({
        id: schema_1.Student.id,
        name: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("name"),
    })
        .from(Session_1.sessionUsers)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, schema_1.Student.id))
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
    // If it's a repeated session, we should try to fetch the other sessions in the same batch
    // to reconstruct the recurringDays array for the frontend.
    let recurringDays = [];
    if (session[0].scheduleType === "repeat" && session[0].startDate && session[0].endDate) {
        // Find all sessions with the same name, start/end dates, and teacher
        const relatedSessions = await connection_1.db.select({
            sessionDate: Session_1.sessions.sessionDate,
            timeFrom: Session_1.sessions.timeFrom,
            timeTo: Session_1.sessions.timeTo,
        })
            .from(Session_1.sessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessions.scheduleType, "repeat"), (0, drizzle_orm_1.eq)(Session_1.sessions.startDate, session[0].startDate), (0, drizzle_orm_1.eq)(Session_1.sessions.endDate, session[0].endDate), (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, session[0].teacherId)));
        // Group by day of week
        const daysMapReverse = {
            0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"
        };
        const uniqueDays = new Map();
        relatedSessions.forEach(rs => {
            if (rs.sessionDate) {
                const dayNum = new Date(rs.sessionDate).getDay();
                if (!uniqueDays.has(dayNum)) {
                    uniqueDays.set(dayNum, {
                        dayOfWeek: daysMapReverse[dayNum],
                        timeFrom: rs.timeFrom,
                        timeTo: rs.timeTo
                    });
                }
            }
        });
        recurringDays = Array.from(uniqueDays.values());
    }
    return (0, response_1.SuccessResponse)(res, {
        session: {
            ...session[0],
            recurringDays: recurringDays.length > 0 ? recurringDays : undefined,
            groups: sessionGroupsData,
            lessons: sessionLessonsData,
            students: sessionStudentsData,
        },
    }, 200);
};
exports.getSessionById = getSessionById;
const updateSession = async (req, res) => {
    const { id } = req.params;
    const { name, scheduleType, // "once" | "repeat"
    sessionDate, // required when scheduleType === "once"
    timeFrom, // required when scheduleType === "once"
    timeTo, // required when scheduleType === "once"
    startDate, // required when scheduleType === "repeat"
    endDate, // required when scheduleType === "repeat"
    recurringDays, // required when scheduleType === "repeat" → [{ dayOfWeek, timeFrom, timeTo }]
    groupIds, // string[] – full replace of linked groups
    studentIds, // string[] – full replace of direct students
    sessionRelationalType, categoryId, subCategoryId, courseId, chapterIds, // string[] – full replace of linked chapters
    lessonIds, // string[] – full replace of linked lessons
    teacherId, session_link, material_link, teacher_material_link, } = req.body;
    // ── 1. Session must exist ─────────────────────────────────────────────
    if (!id)
        throw new BadRequest_1.BadRequest("Session ID is required");
    const sessionExists = await connection_1.db.select().from(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id)).limit(1);
    if (sessionExists.length === 0)
        throw new Errors_1.NotFound("Session not found");
    const currentSession = sessionExists[0];
    // ── 2. Required fields (only validate what is being changed) ─────────
    // Core identity fields: if any academic field is provided, all must be present
    const isChangingAcademics = categoryId || subCategoryId || courseId || chapterIds || lessonIds;
    if (isChangingAcademics) {
        if (!categoryId ||
            !subCategoryId ||
            !courseId ||
            !Array.isArray(chapterIds) || chapterIds.length === 0 ||
            !Array.isArray(lessonIds) || lessonIds.length === 0) {
            throw new BadRequest_1.BadRequest("When updating academic content, all of categoryId, subCategoryId, courseId, chapterIds[], lessonIds[] must be provided together");
        }
    }
    // ── 3. At least one audience if being changed ─────────────────────────
    const isChangingAudience = groupIds !== undefined || studentIds !== undefined;
    if (isChangingAudience) {
        const hasGroups = Array.isArray(groupIds) && groupIds.length > 0;
        const hasStudents = Array.isArray(studentIds) && studentIds.length > 0;
        if (!hasGroups && !hasStudents) {
            throw new BadRequest_1.BadRequest("You must provide at least one group (groupIds[]) or one student (studentIds[])");
        }
    }
    // ── 4. Schedule type and time validation ─────────────────────────────
    // Determine the effective schedule type (new or existing)
    const effectiveScheduleType = scheduleType ?? currentSession.scheduleType;
    let targetSchedules = [];
    const isChangingSchedule = !!(scheduleType || sessionDate || timeFrom || timeTo || startDate || endDate || recurringDays);
    if (isChangingSchedule) {
        if (!["once", "repeat"].includes(effectiveScheduleType)) {
            throw new BadRequest_1.BadRequest("scheduleType must be 'once' or 'repeat'");
        }
        if (effectiveScheduleType === "once") {
            const date = sessionDate ?? currentSession.sessionDate;
            const from = timeFrom ?? currentSession.timeFrom;
            const to = timeTo ?? currentSession.timeTo;
            if (!date || !from || !to) {
                throw new BadRequest_1.BadRequest("sessionDate, timeFrom, and timeTo are required for one-time sessions");
            }
            if (new Date(`${date}T${from}`) >= new Date(`${date}T${to}`)) {
                throw new BadRequest_1.BadRequest("timeFrom must be before timeTo");
            }
            targetSchedules.push({ date, from, to });
        }
        else {
            // repeat
            const sd = startDate ?? currentSession.startDate;
            const ed = endDate ?? currentSession.endDate;
            if (!sd || !ed)
                throw new BadRequest_1.BadRequest("startDate and endDate are required for recurring sessions");
            if (new Date(sd) >= new Date(ed))
                throw new BadRequest_1.BadRequest("startDate must be before endDate");
            if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
                throw new BadRequest_1.BadRequest("recurringDays array is required and cannot be empty for recurring sessions");
            }
            const allowedDays = recurringDays.map((d) => {
                if (!d.dayOfWeek || typeof d.dayOfWeek !== "string") {
                    throw new BadRequest_1.BadRequest("dayOfWeek must be a valid string name (e.g., 'Monday')");
                }
                const dayNum = daysMap[d.dayOfWeek.toLowerCase()];
                if (dayNum === undefined)
                    throw new BadRequest_1.BadRequest(`Invalid day name provided: ${d.dayOfWeek}`);
                return dayNum;
            });
            const generatedDates = getRecurringDates(sd, ed, allowedDays);
            generatedDates.forEach((dateStr) => {
                const currentDayNum = new Date(dateStr).getDay();
                const config = recurringDays.find((d) => daysMap[d.dayOfWeek.toLowerCase()] === currentDayNum);
                if (config) {
                    targetSchedules.push({ date: dateStr, from: config.timeFrom, to: config.timeTo });
                }
            });
            if (targetSchedules.length === 0) {
                throw new BadRequest_1.BadRequest("No valid session dates could be generated with the provided range and days");
            }
        }
    }
    // ── 5. Teacher validation ─────────────────────────────────────────────
    if (teacherId) {
        const teacher = await connection_1.db.select().from(schema_1.teachers).where((0, drizzle_orm_1.eq)(schema_1.teachers.id, teacherId)).limit(1);
        if (teacher.length === 0)
            throw new BadRequest_1.BadRequest("Teacher not found");
    }
    // ── 6. Category hierarchy validation ─────────────────────────────────
    if (isChangingAcademics) {
        const parentCat = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId)).limit(1);
        if (parentCat.length === 0)
            throw new BadRequest_1.BadRequest("Category not found");
        const subCat = await connection_1.db.select().from(schema_1.category).where((0, drizzle_orm_1.eq)(schema_1.category.id, subCategoryId)).limit(1);
        if (subCat.length === 0)
            throw new BadRequest_1.BadRequest("Sub-category not found");
        if (subCat[0].parentCategoryId !== categoryId) {
            throw new BadRequest_1.BadRequest("Sub-category does not belong to the selected category");
        }
        // ── 7. Course validation ──────────────────────────────────────────
        const course = await connection_1.db
            .select()
            .from(schema_1.courses)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.courses.id, courseId), (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, subCategoryId)))
            .limit(1);
        if (course.length === 0)
            throw new BadRequest_1.BadRequest("Course does not belong to the selected sub-category");
        // ── 8. Chapters validation ────────────────────────────────────────
        const chaptersList = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.inArray)(schema_1.chapters.id, chapterIds));
        if (chaptersList.length !== chapterIds.length)
            throw new BadRequest_1.BadRequest("One or more chapters not found");
        const invalidChapters = chaptersList.filter(ch => ch.courseId !== courseId || ch.categoryId !== subCategoryId);
        if (invalidChapters.length > 0) {
            throw new BadRequest_1.BadRequest(`Chapters [${invalidChapters.map(c => c.id).join(", ")}] do not belong to the selected course / sub-category`);
        }
        // ── 9. Lessons validation ─────────────────────────────────────────
        const lessonsList = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
        if (lessonsList.length !== lessonIds.length)
            throw new BadRequest_1.BadRequest("One or more lessons not found");
        const chapterIdSet = new Set(chapterIds);
        const invalidLessons = lessonsList.filter(l => l.courseId !== courseId || l.categoryId !== subCategoryId || !chapterIdSet.has(l.chapterId));
        if (invalidLessons.length > 0) {
            throw new BadRequest_1.BadRequest(`Lessons [${invalidLessons.map(l => l.id).join(", ")}] do not belong to the selected course / chapters / sub-category`);
        }
    }
    // ── 10. Groups validation ─────────────────────────────────────────────
    const hasGroups = Array.isArray(groupIds) && groupIds.length > 0;
    const hasStudents = Array.isArray(studentIds) && studentIds.length > 0;
    if (hasGroups) {
        const groupList = await connection_1.db.select().from(Groups_1.groups).where((0, drizzle_orm_1.inArray)(Groups_1.groups.id, groupIds));
        if (groupList.length !== groupIds.length)
            throw new BadRequest_1.BadRequest("One or more groups not found");
    }
    // ── 11. Students validation ───────────────────────────────────────────
    if (hasStudents) {
        const studentList = await connection_1.db.select().from(schema_1.Student).where((0, drizzle_orm_1.inArray)(schema_1.Student.id, studentIds));
        if (studentList.length !== studentIds.length)
            throw new BadRequest_1.BadRequest("One or more students not found");
    }
    // ── 12. Resolve merged student set ────────────────────────────────────
    // Only compute when audience is being changed
    let uniqueStudentIds = null;
    if (isChangingAudience) {
        uniqueStudentIds = new Set(hasStudents ? studentIds : []);
        if (hasGroups) {
            const groupStudentsList = await connection_1.db
                .select({ studentId: Groups_1.groupStudents.studentId })
                .from(Groups_1.groupStudents)
                .where((0, drizzle_orm_1.inArray)(Groups_1.groupStudents.groupId, groupIds));
            groupStudentsList.forEach(gs => uniqueStudentIds.add(gs.studentId));
        }
    }
    // ── 13. Persist in one transaction ───────────────────────────────────
    await connection_1.db.transaction(async (tx) => {
        // 13a. Update core session fields
        const scheduleFields = isChangingSchedule && targetSchedules.length === 1
            ? {
                scheduleType: effectiveScheduleType,
                sessionDate: targetSchedules[0].date,
                startDate: effectiveScheduleType === "repeat" ? (startDate ?? currentSession.startDate) : null,
                endDate: effectiveScheduleType === "repeat" ? (endDate ?? currentSession.endDate) : null,
                timeFrom: targetSchedules[0].from,
                timeTo: targetSchedules[0].to,
            }
            : {}; // for repeat with many dates we only update metadata, not date/time (multiple rows)
        await tx.update(Session_1.sessions)
            .set({
            ...(name && { name }),
            ...(scheduleType && { scheduleType }),
            ...(session_link && { session_link }),
            ...(material_link && { material_link }),
            ...(teacher_material_link && { teacher_material_link }),
            ...(sessionRelationalType && { sessionRelationalType }),
            ...(teacherId && { teacherId }),
            ...scheduleFields,
        })
            .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
        // 13b. Full replace of lessons
        if (isChangingAcademics) {
            await tx.delete(schema_1.sessionLessons).where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id));
            await tx.insert(schema_1.sessionLessons).values(lessonIds.map((lessonId) => ({ id: (0, crypto_1.randomUUID)(), sessionId: id, lessonId })));
        }
        // 13c. Full replace of groups
        if (groupIds !== undefined && Array.isArray(groupIds)) {
            await tx.delete(Session_1.sessionGroups).where((0, drizzle_orm_1.eq)(Session_1.sessionGroups.sessionId, id));
            if (hasGroups) {
                await tx.insert(Session_1.sessionGroups).values(groupIds.map((gId) => ({ id: (0, crypto_1.randomUUID)(), sessionId: id, groupId: gId })));
            }
        }
        // 13d. Full replace of students (direct + from groups)
        if (isChangingAudience && uniqueStudentIds) {
            await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
            if (uniqueStudentIds.size > 0) {
                await tx.insert(Session_1.sessionUsers).values(Array.from(uniqueStudentIds).map(studentId => ({ id: (0, crypto_1.randomUUID)(), sessionId: id, studentId })));
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
    const targetSession = sessionExists[0];
    let sessionIdsToDelete = [id];
    // If it's a repeated session, find all related sessions in the same series
    if (targetSession.scheduleType === "repeat" && targetSession.startDate && targetSession.endDate) {
        const relatedSessions = await connection_1.db.select({ id: Session_1.sessions.id })
            .from(Session_1.sessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessions.scheduleType, "repeat"), (0, drizzle_orm_1.eq)(Session_1.sessions.startDate, targetSession.startDate), (0, drizzle_orm_1.eq)(Session_1.sessions.endDate, targetSession.endDate), (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, targetSession.teacherId)));
        sessionIdsToDelete = relatedSessions.map(s => s.id);
    }
    await connection_1.db.transaction(async (tx) => {
        // Delete related entities for all targeted sessions first due to foreign key constraints
        await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.inArray)(Session_1.sessionUsers.sessionId, sessionIdsToDelete));
        await tx.delete(Session_1.sessionGroups).where((0, drizzle_orm_1.inArray)(Session_1.sessionGroups.sessionId, sessionIdsToDelete));
        await tx.delete(schema_1.sessionLessons).where((0, drizzle_orm_1.inArray)(schema_1.sessionLessons.sessionId, sessionIdsToDelete));
        await tx.delete(Session_1.sessionRatings).where((0, drizzle_orm_1.inArray)(Session_1.sessionRatings.sessionId, sessionIdsToDelete));
        await tx.delete(schema_1.sessionAttendance).where((0, drizzle_orm_1.inArray)(schema_1.sessionAttendance.sessionId, sessionIdsToDelete));
        // Final delete of the target sessions
        await tx.delete(Session_1.sessions).where((0, drizzle_orm_1.inArray)(Session_1.sessions.id, sessionIdsToDelete));
    });
    return (0, response_1.SuccessResponse)(res, { message: `Successfully deleted ${sessionIdsToDelete.length} session(s)` }, 200);
};
exports.deleteSession = deleteSession;
