"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSessionStudentPdf = exports.upsertSessionStudentPdfs = exports.getStudentsCourseAttendance = exports.deleteSession = exports.updateSession = exports.regenerateMistakesSessionPdfs = exports.getSessionById = exports.getAllSessions = exports.createSession = exports.selectGroups = exports.selectTeachers = exports.selectStudents = exports.selectLesson = exports.selectChapter = exports.selectCourse = exports.selectSubCategory = exports.selectCategory = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const Session_1 = require("../../models/schema/admin/Session");
const Groups_1 = require("../../models/schema/admin/Groups");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const mysql_core_1 = require("drizzle-orm/mysql-core");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const handleImages_1 = require("../../utils/handleImages");
const sessionMaterials_1 = require("../../utils/sessionMaterials");
const mistakesGenerator_1 = require("../../utils/mistakesGenerator");
// Selections
const selectCategory = async (req, res) => {
    const parentCategories = await connection_1.db
        .select({ id: schema_1.category.id, name: schema_1.category.name })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.sql) `${schema_1.category.parentCategoryId} IS NULL`);
    return (0, response_1.SuccessResponse)(res, { categories: parentCategories });
};
exports.selectCategory = selectCategory;
const selectSubCategory = async (req, res) => {
    const { categoryId } = req.query;
    if (categoryId) {
        const parentCat = await connection_1.db
            .select({ id: schema_1.category.id })
            .from(schema_1.category)
            .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId))
            .limit(1);
        if (parentCat.length === 0)
            throw new BadRequest_1.BadRequest("Category not found");
    }
    const parentCategory = schema_1.category.$inferSelect;
    const parentAlias = connection_1.db.$with("parent").as(connection_1.db.select({ id: schema_1.category.id, name: schema_1.category.name }).from(schema_1.category));
    const subCategories = await connection_1.db
        .select({
        id: schema_1.category.id,
        name: schema_1.category.name,
        parentCategory: {
            id: (0, drizzle_orm_1.sql) `parent.id`.as("parentId"),
            name: (0, drizzle_orm_1.sql) `parent.name`.as("parentName"),
        },
    })
        .from(schema_1.category)
        .leftJoin((0, drizzle_orm_1.sql) `${schema_1.category} as parent`, (0, drizzle_orm_1.sql) `${schema_1.category.parentCategoryId} = parent.id`)
        .where(categoryId
        ? (0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, categoryId)
        : (0, drizzle_orm_1.sql) `${schema_1.category.parentCategoryId} IS NOT NULL`);
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
    examId, // optional exam for Exam-type sessions
    teacherId, session_link, material_link, teacher_material_link, contentAccessDays, // number | null – days students can access content after attending (null = permanent)
    // ── PDF fields ──────────────────────────────────────────────────────────
    // For all session types (base64-encoded PDF strings or existing URLs):
    session_pdf, // blank PDF for students & teacher
    session_answers_pdf, // answers PDF visible to teacher only
     } = req.body;
    // ── 1. Required field presence (General fields) ────────────────────────
    if (!name ||
        !scheduleType ||
        !teacherId ||
        !sessionRelationalType ||
        !categoryId ||
        !subCategoryId ||
        !courseId) {
        throw new BadRequest_1.BadRequest("Missing or invalid required fields: name, scheduleType, teacherId, sessionRelationalType, categoryId, subCategoryId, courseId");
    }
    if (chapterIds !== undefined && !Array.isArray(chapterIds)) {
        throw new BadRequest_1.BadRequest("chapterIds must be an array");
    }
    if (sessionRelationalType !== "Exam" && (!Array.isArray(chapterIds) || chapterIds.length === 0)) {
        throw new BadRequest_1.BadRequest("chapterIds[] is required and cannot be empty for non-Exam sessions");
    }
    const effectiveChapterIds = Array.isArray(chapterIds) ? chapterIds : [];
    if (lessonIds !== undefined && !Array.isArray(lessonIds)) {
        throw new BadRequest_1.BadRequest("lessonIds must be an array");
    }
    if (sessionRelationalType !== "Exam" && (!Array.isArray(lessonIds) || lessonIds.length === 0)) {
        throw new BadRequest_1.BadRequest("lessonIds[] is required and cannot be empty for non-Exam sessions");
    }
    const effectiveLessonIds = Array.isArray(lessonIds) ? lessonIds : [];
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
    if (effectiveChapterIds.length > 0) {
        const chaptersList = await connection_1.db.select().from(schema_1.chapters).where((0, drizzle_orm_1.inArray)(schema_1.chapters.id, effectiveChapterIds));
        if (chaptersList.length !== effectiveChapterIds.length) {
            throw new BadRequest_1.BadRequest("One or more chapters not found");
        }
        const invalidChapters = chaptersList.filter(ch => ch.courseId !== courseId || ch.categoryId !== subCategoryId);
        if (invalidChapters.length > 0) {
            throw new BadRequest_1.BadRequest(`Chapters [${invalidChapters.map(c => c.id).join(", ")}] do not belong to the selected course / sub-category`);
        }
    }
    // ── 8. Lessons validation ─────────────────────────────────────────────
    if (effectiveLessonIds.length > 0) {
        const lessonsList = await connection_1.db.select().from(schema_1.lessons).where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, effectiveLessonIds));
        if (lessonsList.length !== effectiveLessonIds.length) {
            throw new BadRequest_1.BadRequest("One or more lessons not found");
        }
        const chapterIdSet = new Set(effectiveChapterIds);
        const invalidLessons = lessonsList.filter(l => l.courseId !== courseId || l.categoryId !== subCategoryId ||
            (chapterIdSet.size > 0 && !chapterIdSet.has(l.chapterId)));
        if (invalidLessons.length > 0) {
            throw new BadRequest_1.BadRequest(`Lessons [${invalidLessons.map(l => l.id).join(", ")}] do not belong to the selected course / chapters / sub-category`);
        }
    }
    let linkedExam;
    if (examId) {
        if (sessionRelationalType !== "Exam") {
            throw new BadRequest_1.BadRequest("examId can only be set for Exam-type sessions");
        }
        [linkedExam] = await connection_1.db.select().from(schema_1.Exams).where((0, drizzle_orm_1.eq)(schema_1.Exams.id, examId)).limit(1);
        if (!linkedExam)
            throw new BadRequest_1.BadRequest("Exam not found");
        if (linkedExam.courseId !== courseId)
            throw new BadRequest_1.BadRequest("Exam does not belong to the selected course");
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
    // ── 13. Process and save session-level PDFs (base64 → disk) ──────────
    let savedSessionPdf = null;
    let savedSessionAnswersPdf = null;
    const selectedSessionPdf = session_pdf || null;
    const selectedAnswersPdf = session_answers_pdf || null;
    if (selectedSessionPdf) {
        if (typeof selectedSessionPdf !== "string")
            throw new BadRequest_1.BadRequest("session_pdf must be a URL or base64-encoded PDF");
        if (selectedSessionPdf.startsWith("http")) {
            savedSessionPdf = selectedSessionPdf;
        }
        else {
            savedSessionPdf = await (0, handleImages_1.validateAndSavePdf)(req, selectedSessionPdf, "session-pdfs");
        }
    }
    if (selectedAnswersPdf) {
        if (typeof selectedAnswersPdf !== "string")
            throw new BadRequest_1.BadRequest("session_answers_pdf must be a URL or base64-encoded PDF");
        if (selectedAnswersPdf.startsWith("http")) {
            savedSessionAnswersPdf = selectedAnswersPdf;
        }
        else {
            savedSessionAnswersPdf = await (0, handleImages_1.validateAndSavePdf)(req, selectedAnswersPdf, "session-pdfs");
        }
    }
    // ── 14. Build arrays for Bulk Insertion ───────────────────────────────────
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
            examId: linkedExam?.id ?? null,
            session_link: session_link ?? null,
            material_link: material_link ?? null,
            teacher_material_link: teacher_material_link ?? null,
            sessionRelationalType,
            contentAccessDays: contentAccessDays != null ? Number(contentAccessDays) : null,
            session_pdf: savedSessionPdf,
            session_answers_pdf: savedSessionAnswersPdf,
            teacher_explanation_pdf: null,
        });
        // ربط الدروس بالحصة الحالية
        effectiveLessonIds.forEach((lessonId) => {
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
    // ── 16. Persist everything in one clean transaction ─────────────────────────
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(Session_1.sessions).values(sessionsToInsert);
        if (sessionGroupsInserts.length > 0) {
            await tx.insert(Session_1.sessionGroups).values(sessionGroupsInserts);
        }
        if (sessionUsersInserts.length > 0) {
            await tx.insert(Session_1.sessionUsers).values(sessionUsersInserts);
        }
        if (lessonInserts.length > 0) {
            await tx.insert(schema_1.sessionLessons).values(lessonInserts);
        }
    });
    if (sessionRelationalType === "Mistakes") {
        const targetStudentIds = hasStudents ? [...new Set(studentIds)] : Array.from(uniqueStudentIds);
        const mistakeSessionsResults = [];
        let mistakesError;
        try {
            for (const s of sessionsToInsert) {
                const target = {
                    id: s.id,
                    name: s.name,
                    lessonIds: effectiveLessonIds,
                };
                const result = await (0, mistakesGenerator_1.generateMistakesPdfs)(req, target, targetStudentIds);
                mistakeSessionsResults.push({
                    sessionId: s.id,
                    sessionName: s.name,
                    ...result,
                });
            }
        }
        catch (err) {
            console.error("Failed to generate mistakes PDFs:", err);
            mistakesError = err?.message || "Failed to generate mistakes PDFs";
        }
        return (0, response_1.SuccessResponse)(res, {
            message: `${sessionsToInsert.length} session(s) created successfully`,
            mistakes: {
                sessions: mistakeSessionsResults,
                ...(mistakesError ? { error: mistakesError } : {}),
            },
        }, 201);
    }
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
        examId: Session_1.sessions.examId,
        session_link: Session_1.sessions.session_link,
        material_link: Session_1.sessions.material_link,
        teacher_material_link: Session_1.sessions.teacher_material_link,
        contentAccessDays: Session_1.sessions.contentAccessDays,
        session_pdf: Session_1.sessions.session_pdf,
        session_answers_pdf: Session_1.sessions.session_answers_pdf,
        teacher_explanation_pdf: Session_1.sessions.teacher_explanation_pdf,
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
    const [materialsMap, groupsSummary, studentsSummary, studentPdfsSummary] = await Promise.all([
        (0, sessionMaterials_1.resolveSessionMaterials)(sessionIds),
        sessionIds.length > 0
            ? connection_1.db.select({
                sessionId: Session_1.sessionGroups.sessionId,
                groupId: Groups_1.groups.id,
                groupName: Groups_1.groups.name,
            })
                .from(Session_1.sessionGroups)
                .innerJoin(Groups_1.groups, (0, drizzle_orm_1.eq)(Session_1.sessionGroups.groupId, Groups_1.groups.id))
                .where((0, drizzle_orm_1.inArray)(Session_1.sessionGroups.sessionId, sessionIds))
            : Promise.resolve([]),
        sessionIds.length > 0
            ? connection_1.db.select({
                sessionId: Session_1.sessionUsers.sessionId,
                studentId: schema_1.Student.id,
                studentName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("studentName"),
            })
                .from(Session_1.sessionUsers)
                .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, schema_1.Student.id))
                .where((0, drizzle_orm_1.inArray)(Session_1.sessionUsers.sessionId, sessionIds))
            : Promise.resolve([]),
        sessionIds.length > 0
            ? connection_1.db.select({
                sessionId: Session_1.sessionStudentPdfs.sessionId,
                studentId: schema_1.Student.id,
                studentName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("studentName"),
                session_pdf: Session_1.sessionStudentPdfs.session_pdf,
                session_answers_pdf: Session_1.sessionStudentPdfs.session_answers_pdf,
                teacher_explanation_pdf: Session_1.sessionStudentPdfs.teacher_explanation_pdf,
                createdAt: Session_1.sessionStudentPdfs.createdAt,
                updatedAt: Session_1.sessionStudentPdfs.updatedAt,
            })
                .from(Session_1.sessionStudentPdfs)
                .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.studentId, schema_1.Student.id))
                .where((0, drizzle_orm_1.inArray)(Session_1.sessionStudentPdfs.sessionId, sessionIds))
            : Promise.resolve([]),
    ]);
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
    const studentPdfsBySession = new Map();
    studentPdfsSummary.forEach(pdf => {
        if (!studentPdfsBySession.has(pdf.sessionId))
            studentPdfsBySession.set(pdf.sessionId, []);
        studentPdfsBySession.get(pdf.sessionId).push(pdf);
    });
    const result = sessionsList.map(session => {
        const mat = materialsMap.get(session.id) || (0, sessionMaterials_1.emptySessionMaterials)();
        const sessionStudentPdfs = studentPdfsBySession.get(session.id) ?? [];
        const effectiveSessionPdfs = mat.materials
            .filter(material => material.session_pdf)
            .map(({ source, sourceId, name, session_pdf }) => ({ source, sourceId, name, pdf: session_pdf }));
        const effectiveSessionAnswersPdfs = mat.materials
            .filter(material => material.session_answers_pdf)
            .map(({ source, sourceId, name, session_answers_pdf }) => ({ source, sourceId, name, pdf: session_answers_pdf }));
        return {
            ...session,
            effective_session_pdf: mat.session_pdf,
            effective_session_answers_pdf: mat.session_answers_pdf,
            effective_session_pdfs: effectiveSessionPdfs,
            effective_session_answers_pdfs: effectiveSessionAnswersPdfs,
            materials: mat.materials,
            groups: groupsBySession.get(session.id) ?? [],
            groupCount: groupsBySession.get(session.id)?.length ?? 0,
            students: studentsBySession.get(session.id) ?? [],
            studentCount: studentsBySession.get(session.id)?.length ?? 0,
            studentPdfs: session.sessionRelationalType === "Mistakes"
                ? sessionStudentPdfs
                : undefined,
        };
    });
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
        contentAccessDays: Session_1.sessions.contentAccessDays,
        session_pdf: Session_1.sessions.session_pdf,
        session_answers_pdf: Session_1.sessions.session_answers_pdf,
        teacher_explanation_pdf: Session_1.sessions.teacher_explanation_pdf,
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
    const parentCategory = (0, mysql_core_1.alias)(schema_1.category, 'parentCategory');
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
        subcategory: {
            id: schema_1.category.id,
            name: schema_1.category.name,
        },
        category: {
            id: parentCategory.id,
            name: parentCategory.name,
        },
    })
        .from(schema_1.sessionLessons)
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.sessionLessons.lessonId, schema_1.lessons.id))
        .innerJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
        .innerJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .leftJoin(parentCategory, (0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, parentCategory.id))
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
    // For Mistakes sessions, fetch per-student PDFs (admin-assigned + teacher explanation)
    let studentPdfs = [];
    if (session[0].sessionRelationalType === "Mistakes") {
        studentPdfs = await connection_1.db.select({
            id: Session_1.sessionStudentPdfs.id,
            studentId: Session_1.sessionStudentPdfs.studentId,
            studentName: (0, drizzle_orm_1.sql) `CONCAT(${schema_1.Student.firstname}, ' ', ${schema_1.Student.lastname})`.as("studentName"),
            session_pdf: Session_1.sessionStudentPdfs.session_pdf,
            session_answers_pdf: Session_1.sessionStudentPdfs.session_answers_pdf,
            teacher_explanation_pdf: Session_1.sessionStudentPdfs.teacher_explanation_pdf,
            createdAt: Session_1.sessionStudentPdfs.createdAt,
            updatedAt: Session_1.sessionStudentPdfs.updatedAt,
        })
            .from(Session_1.sessionStudentPdfs)
            .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.studentId, schema_1.Student.id))
            .where((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.sessionId, id));
    }
    const materialsMap = await (0, sessionMaterials_1.resolveSessionMaterials)([id]);
    const mat = materialsMap.get(id) || (0, sessionMaterials_1.emptySessionMaterials)();
    const effectiveSessionPdfs = mat.materials
        .filter(material => material.session_pdf)
        .map(({ source, sourceId, name, session_pdf }) => ({ source, sourceId, name, pdf: session_pdf }));
    const effectiveSessionAnswersPdfs = mat.materials
        .filter(material => material.session_answers_pdf)
        .map(({ source, sourceId, name, session_answers_pdf }) => ({ source, sourceId, name, pdf: session_answers_pdf }));
    return (0, response_1.SuccessResponse)(res, {
        session: {
            ...session[0],
            effective_session_pdf: mat.session_pdf,
            effective_session_answers_pdf: mat.session_answers_pdf,
            effective_session_pdfs: effectiveSessionPdfs,
            effective_session_answers_pdfs: effectiveSessionAnswersPdfs,
            materials: mat.materials,
            recurringDays: recurringDays.length > 0 ? recurringDays : undefined,
            groups: sessionGroupsData,
            lessons: sessionLessonsData,
            students: sessionStudentsData,
            // PDF data
            studentPdfs: session[0].sessionRelationalType === "Mistakes" ? studentPdfs : undefined,
        },
    }, 200);
};
exports.getSessionById = getSessionById;
const regenerateMistakesSessionPdfs = async (req, res) => {
    const { id } = req.params;
    const [session] = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
    })
        .from(Session_1.sessions)
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id))
        .limit(1);
    if (!session)
        throw new Errors_1.NotFound("Session not found");
    if (session.sessionRelationalType !== "Mistakes") {
        throw new BadRequest_1.BadRequest("Mistakes PDFs can only be generated for Mistakes-type sessions");
    }
    const [lessonRows, directStudentRows, groupRows] = await Promise.all([
        connection_1.db.select({ lessonId: schema_1.sessionLessons.lessonId })
            .from(schema_1.sessionLessons)
            .where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id)),
        connection_1.db.select({ studentId: Session_1.sessionUsers.studentId })
            .from(Session_1.sessionUsers)
            .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id)),
        connection_1.db.select({ groupId: Session_1.sessionGroups.groupId })
            .from(Session_1.sessionGroups)
            .where((0, drizzle_orm_1.eq)(Session_1.sessionGroups.sessionId, id)),
    ]);
    const studentIds = new Set(directStudentRows.map(row => row.studentId));
    const groupIds = [...new Set(groupRows.map(row => row.groupId))];
    if (groupIds.length > 0) {
        const groupStudentRows = await connection_1.db
            .select({ studentId: Groups_1.groupStudents.studentId })
            .from(Groups_1.groupStudents)
            .where((0, drizzle_orm_1.inArray)(Groups_1.groupStudents.groupId, groupIds));
        groupStudentRows.forEach(row => studentIds.add(row.studentId));
    }
    const result = await (0, mistakesGenerator_1.generateMistakesPdfs)(req, {
        id: session.id,
        name: session.name,
        lessonIds: [...new Set(lessonRows.map(row => row.lessonId))],
    }, [...studentIds]);
    return (0, response_1.SuccessResponse)(res, {
        sessionId: session.id,
        ...result,
    });
};
exports.regenerateMistakesSessionPdfs = regenerateMistakesSessionPdfs;
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
    sessionRelationalType, examId, categoryId, subCategoryId, courseId, chapterIds, // string[] – full replace of linked chapters
    lessonIds, // string[] – full replace of linked lessons
    teacherId, session_link, material_link, teacher_material_link, contentAccessDays, // number | null | undefined – omit to leave unchanged
    // ── PDF fields (optional – omit to leave unchanged) ──────────────
    session_pdf, // base64 PDF or URL string, or null to clear
    session_answers_pdf, // base64 PDF or URL string, or null to clear
    teacher_explanation_pdf, // base64 PDF or URL string, or null to clear
    // For Mistakes sessions – upsert per-student PDFs:
    // studentPdfs: Array<{ studentId: string, session_pdf?: string, session_answers_pdf?: string, teacher_explanation_pdf?: string }>
    studentPdfs, } = req.body;
    // ── 1. Session must exist ─────────────────────────────────────────────
    if (!id)
        throw new BadRequest_1.BadRequest("Session ID is required");
    const sessionExists = await connection_1.db.select().from(Session_1.sessions).where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id)).limit(1);
    if (sessionExists.length === 0)
        throw new Errors_1.NotFound("Session not found");
    const currentSession = sessionExists[0];
    if (examId !== undefined) {
        if (examId !== null && (sessionRelationalType ?? currentSession.sessionRelationalType) !== "Exam") {
            throw new BadRequest_1.BadRequest("examId can only be set for Exam-type sessions");
        }
        if (examId !== null) {
            const [linkedExam] = await connection_1.db.select({ id: schema_1.Exams.id }).from(schema_1.Exams).where((0, drizzle_orm_1.eq)(schema_1.Exams.id, examId)).limit(1);
            if (!linkedExam)
                throw new BadRequest_1.BadRequest("Exam not found");
        }
    }
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
    // ── 13. Process session-level PDF updates ────────────────────────────────
    let newSessionPdf = undefined; // undefined = not changing
    let newSessionAnswersPdf = undefined;
    let newTeacherExplanationPdf = undefined;
    if (session_pdf !== undefined) {
        if (session_pdf === null) {
            // Explicitly clear the PDF
            if (currentSession.session_pdf)
                await (0, handleImages_1.deleteImage)(currentSession.session_pdf);
            newSessionPdf = null;
        }
        else if (session_pdf.startsWith("http")) {
            newSessionPdf = session_pdf; // existing URL – no re-upload needed
        }
        else {
            if (currentSession.session_pdf)
                await (0, handleImages_1.deleteImage)(currentSession.session_pdf);
            newSessionPdf = await (0, handleImages_1.validateAndSavePdf)(req, session_pdf, "session-pdfs");
        }
    }
    if (session_answers_pdf !== undefined) {
        if (session_answers_pdf === null) {
            if (currentSession.session_answers_pdf)
                await (0, handleImages_1.deleteImage)(currentSession.session_answers_pdf);
            newSessionAnswersPdf = null;
        }
        else if (session_answers_pdf.startsWith("http")) {
            newSessionAnswersPdf = session_answers_pdf;
        }
        else {
            if (currentSession.session_answers_pdf)
                await (0, handleImages_1.deleteImage)(currentSession.session_answers_pdf);
            newSessionAnswersPdf = await (0, handleImages_1.validateAndSavePdf)(req, session_answers_pdf, "session-pdfs");
        }
    }
    if (teacher_explanation_pdf !== undefined) {
        if (teacher_explanation_pdf === null) {
            if (currentSession.teacher_explanation_pdf)
                await (0, handleImages_1.deleteImage)(currentSession.teacher_explanation_pdf);
            newTeacherExplanationPdf = null;
        }
        else if (teacher_explanation_pdf.startsWith("http")) {
            newTeacherExplanationPdf = teacher_explanation_pdf;
        }
        else {
            if (currentSession.teacher_explanation_pdf)
                await (0, handleImages_1.deleteImage)(currentSession.teacher_explanation_pdf);
            newTeacherExplanationPdf = await (0, handleImages_1.validateAndSavePdf)(req, teacher_explanation_pdf, "session-pdfs");
        }
    }
    // ── 14. Validate & process per-student PDFs (Mistakes sessions only) ─────
    // Determine the effective session type after update
    const effectiveRelationalType = sessionRelationalType ?? currentSession.sessionRelationalType;
    const isMistakesSession = effectiveRelationalType === "Mistakes";
    const hasStudentPdfs = isMistakesSession && Array.isArray(studentPdfs) && studentPdfs.length > 0;
    // Resolve the current enrolled student set for validation
    let enrolledStudentIds;
    if (uniqueStudentIds) {
        enrolledStudentIds = uniqueStudentIds;
    }
    else {
        // Use existing enrolled students
        const existingUsers = await connection_1.db
            .select({ studentId: Session_1.sessionUsers.studentId })
            .from(Session_1.sessionUsers)
            .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
        enrolledStudentIds = new Set(existingUsers.map(u => u.studentId));
    }
    if (hasStudentPdfs) {
        const pdfStudentIds = studentPdfs.map((p) => p.studentId);
        const invalidPdfStudents = pdfStudentIds.filter(sid => !enrolledStudentIds.has(sid));
        if (invalidPdfStudents.length > 0) {
            throw new BadRequest_1.BadRequest(`studentPdfs contains students not enrolled in this session: [${invalidPdfStudents.join(", ")}]`);
        }
    }
    const resolvedStudentPdfUpdates = [];
    if (hasStudentPdfs) {
        for (const entry of studentPdfs) {
            const spdf = entry.session_pdf;
            const sapdf = entry.session_answers_pdf;
            const tepdf = entry.teacher_explanation_pdf;
            const savedSpdf = spdf !== undefined
                ? (spdf === null ? null : spdf.startsWith("http") ? spdf : await (0, handleImages_1.validateAndSavePdf)(req, spdf, "session-pdfs"))
                : undefined;
            const savedSapdf = sapdf !== undefined
                ? (sapdf === null ? null : sapdf.startsWith("http") ? sapdf : await (0, handleImages_1.validateAndSavePdf)(req, sapdf, "session-pdfs"))
                : undefined;
            const savedTepdf = tepdf !== undefined
                ? (tepdf === null ? null : tepdf.startsWith("http") ? tepdf : await (0, handleImages_1.validateAndSavePdf)(req, tepdf, "session-pdfs"))
                : undefined;
            resolvedStudentPdfUpdates.push({
                studentId: entry.studentId,
                session_pdf: savedSpdf,
                session_answers_pdf: savedSapdf,
                teacher_explanation_pdf: savedTepdf,
            });
        }
    }
    // ── 15. Persist in one transaction ───────────────────────────────────
    await connection_1.db.transaction(async (tx) => {
        // 15a. Update core session fields
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
            ...(examId !== undefined && { examId }),
            // Allow explicit null to clear the expiry (permanent access)
            ...(contentAccessDays !== undefined && {
                contentAccessDays: contentAccessDays != null ? Number(contentAccessDays) : null,
            }),
            // PDF fields – only include if the caller sent them
            ...(newSessionPdf !== undefined && { session_pdf: newSessionPdf }),
            ...(newSessionAnswersPdf !== undefined && { session_answers_pdf: newSessionAnswersPdf }),
            ...(newTeacherExplanationPdf !== undefined && { teacher_explanation_pdf: newTeacherExplanationPdf }),
            ...scheduleFields,
        })
            .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, id));
        // 15b. Full replace of lessons
        if (isChangingAcademics) {
            await tx.delete(schema_1.sessionLessons).where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, id));
            await tx.insert(schema_1.sessionLessons).values(lessonIds.map((lessonId) => ({ id: (0, crypto_1.randomUUID)(), sessionId: id, lessonId })));
        }
        // 15c. Full replace of groups
        if (groupIds !== undefined && Array.isArray(groupIds)) {
            await tx.delete(Session_1.sessionGroups).where((0, drizzle_orm_1.eq)(Session_1.sessionGroups.sessionId, id));
            if (hasGroups) {
                await tx.insert(Session_1.sessionGroups).values(groupIds.map((gId) => ({ id: (0, crypto_1.randomUUID)(), sessionId: id, groupId: gId })));
            }
        }
        // 15d. Full replace of students (direct + from groups)
        if (isChangingAudience && uniqueStudentIds) {
            await tx.delete(Session_1.sessionUsers).where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, id));
            if (uniqueStudentIds.size > 0) {
                await tx.insert(Session_1.sessionUsers).values(Array.from(uniqueStudentIds).map(studentId => ({ id: (0, crypto_1.randomUUID)(), sessionId: id, studentId })));
            }
        }
        // 15e. Upsert per-student PDFs (Mistakes sessions)
        if (hasStudentPdfs) {
            for (const entry of resolvedStudentPdfUpdates) {
                const [existing] = await tx
                    .select({ id: Session_1.sessionStudentPdfs.id })
                    .from(Session_1.sessionStudentPdfs)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.sessionId, id), (0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.studentId, entry.studentId)));
                if (existing) {
                    await tx.update(Session_1.sessionStudentPdfs)
                        .set({
                        ...(entry.session_pdf !== undefined && { session_pdf: entry.session_pdf }),
                        ...(entry.session_answers_pdf !== undefined && { session_answers_pdf: entry.session_answers_pdf }),
                        ...(entry.teacher_explanation_pdf !== undefined && { teacher_explanation_pdf: entry.teacher_explanation_pdf }),
                    })
                        .where((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.id, existing.id));
                }
                else {
                    await tx.insert(Session_1.sessionStudentPdfs).values({
                        id: (0, crypto_1.randomUUID)(),
                        sessionId: id,
                        studentId: entry.studentId,
                        session_pdf: entry.session_pdf ?? null,
                        session_answers_pdf: entry.session_answers_pdf ?? null,
                        teacher_explanation_pdf: entry.teacher_explanation_pdf ?? null,
                    });
                }
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
        await tx.delete(Session_1.sessionStudentPdfs).where((0, drizzle_orm_1.inArray)(Session_1.sessionStudentPdfs.sessionId, sessionIdsToDelete));
        // Final delete of the target sessions
        await tx.delete(Session_1.sessions).where((0, drizzle_orm_1.inArray)(Session_1.sessions.id, sessionIdsToDelete));
    });
    return (0, response_1.SuccessResponse)(res, { message: `Successfully deleted ${sessionIdsToDelete.length} session(s)` }, 200);
};
exports.deleteSession = deleteSession;
const getStudentsCourseAttendance = async (req, res) => {
    const { studentIds, courseId } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new BadRequest_1.BadRequest("studentIds array is required");
    }
    if (!courseId) {
        throw new BadRequest_1.BadRequest("courseId is required");
    }
    // Query: get all present attendance records with lesson/chapter info
    const attendanceRecords = await connection_1.db
        .select({
        studentId: schema_1.Student.id,
        studentFirstName: schema_1.Student.firstname,
        studentLastName: schema_1.Student.lastname,
        chapterId: schema_1.chapters.id,
        chapterName: schema_1.chapters.name,
        lessonId: schema_1.lessons.id,
        lessonName: schema_1.lessons.name,
    })
        .from(schema_1.sessionAttendance)
        .innerJoin(schema_1.Student, (0, drizzle_orm_1.eq)(schema_1.sessionAttendance.studentId, schema_1.Student.id))
        .innerJoin(Session_1.sessions, (0, drizzle_orm_1.eq)(schema_1.sessionAttendance.sessionId, Session_1.sessions.id))
        .innerJoin(schema_1.sessionLessons, (0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, Session_1.sessions.id))
        .innerJoin(schema_1.lessons, (0, drizzle_orm_1.eq)(schema_1.sessionLessons.lessonId, schema_1.lessons.id))
        .innerJoin(schema_1.chapters, (0, drizzle_orm_1.eq)(schema_1.lessons.chapterId, schema_1.chapters.id))
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.chapters.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.sessionAttendance.studentId, studentIds), (0, drizzle_orm_1.eq)(schema_1.sessionAttendance.status, "present"), (0, drizzle_orm_1.eq)(schema_1.courses.id, courseId)));
    // Build nested structure: student → chapters → lessons
    const studentAttendanceById = new Map();
    for (const record of attendanceRecords) {
        // Initialize student entry if not exists
        if (!studentAttendanceById.has(record.studentId)) {
            studentAttendanceById.set(record.studentId, {
                studentId: record.studentId,
                studentName: `${record.studentFirstName} ${record.studentLastName}`,
                chaptersById: new Map(),
            });
        }
        const studentAttendance = studentAttendanceById.get(record.studentId);
        // Initialize chapter entry if not exists
        if (!studentAttendance.chaptersById.has(record.chapterId)) {
            studentAttendance.chaptersById.set(record.chapterId, {
                id: record.chapterId,
                name: record.chapterName,
                lessons: [],
            });
        }
        const chapterAttendance = studentAttendance.chaptersById.get(record.chapterId);
        // Add lesson only if not already present (deduplicate)
        const isLessonAlreadyAdded = chapterAttendance.lessons.some((lesson) => lesson.id === record.lessonId);
        if (!isLessonAlreadyAdded) {
            chapterAttendance.lessons.push({
                id: record.lessonId,
                name: record.lessonName,
            });
        }
    }
    // Build final response preserving input student order
    const studentsWithAttendance = studentIds.map((studentId) => {
        const attendanceData = studentAttendanceById.get(studentId);
        if (!attendanceData) {
            return {
                studentId,
                studentName: null,
                chapters: [],
            };
        }
        return {
            studentId: attendanceData.studentId,
            studentName: attendanceData.studentName,
            chapters: Array.from(attendanceData.chaptersById.values()),
        };
    });
    return (0, response_1.SuccessResponse)(res, { students: studentsWithAttendance }, 200);
};
exports.getStudentsCourseAttendance = getStudentsCourseAttendance;
/**
 * Generate combined worksheet and answer PDFs from selected students' wrong
 * answers in completed exams for lessons linked to the session.
 */
const upsertSessionStudentPdfs = async (req, res) => {
    const { id: sessionId } = req.params;
    const { studentIds } = req.body;
    if (!sessionId)
        throw new BadRequest_1.BadRequest("Session ID is required");
    const [session] = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        sessionDate: Session_1.sessions.sessionDate,
        timeFrom: Session_1.sessions.timeFrom,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
    })
        .from(Session_1.sessions)
        .where((0, drizzle_orm_1.eq)(Session_1.sessions.id, sessionId));
    if (!session)
        throw new Errors_1.NotFound("Session not found");
    if (session.sessionRelationalType !== "Mistakes") {
        throw new BadRequest_1.BadRequest("Mistakes PDFs can only be generated for Mistakes-type sessions");
    }
    const enrolledUsers = await connection_1.db
        .select({ studentId: Session_1.sessionUsers.studentId })
        .from(Session_1.sessionUsers)
        .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, sessionId));
    const enrolledIds = enrolledUsers.map(u => u.studentId);
    if (enrolledIds.length === 0) {
        throw new BadRequest_1.BadRequest("No students enrolled in this session");
    }
    let targetStudentIds;
    if (studentIds !== undefined) {
        if (!Array.isArray(studentIds) || studentIds.length === 0 || studentIds.some((s) => typeof s !== "string")) {
            throw new BadRequest_1.BadRequest("studentIds must be a non-empty array of student IDs");
        }
        const selectedStudentIds = [...new Set(studentIds)];
        const enrolledSet = new Set(enrolledIds);
        const invalidStudents = selectedStudentIds.filter(sId => !enrolledSet.has(sId));
        if (invalidStudents.length > 0) {
            throw new BadRequest_1.BadRequest(`Students not enrolled in this session: [${invalidStudents.join(", ")}]`);
        }
        targetStudentIds = selectedStudentIds;
    }
    else {
        targetStudentIds = enrolledIds;
    }
    const lessonRows = await connection_1.db
        .select({ lessonId: schema_1.sessionLessons.lessonId })
        .from(schema_1.sessionLessons)
        .where((0, drizzle_orm_1.eq)(schema_1.sessionLessons.sessionId, sessionId));
    const lessonIds = [...new Set(lessonRows.map(row => row.lessonId))];
    if (lessonIds.length === 0)
        throw new BadRequest_1.BadRequest("The Mistakes session has no linked lessons");
    const target = {
        id: session.id,
        name: session.name,
        lessonIds,
    };
    const result = await (0, mistakesGenerator_1.generateMistakesPdfs)(req, target, targetStudentIds);
    return (0, response_1.SuccessResponse)(res, {
        message: "Combined mistakes PDFs generated successfully",
        ...result,
    }, 200);
};
exports.upsertSessionStudentPdfs = upsertSessionStudentPdfs;
/**
 * DELETE /admin/sessions/:id/student-pdfs/:studentId
 * Remove a per-student PDF row for a Mistakes-type session.
 */
const deleteSessionStudentPdf = async (req, res) => {
    const { id: sessionId, studentId } = req.params;
    if (!sessionId || !studentId) {
        throw new BadRequest_1.BadRequest("Session ID and student ID are required");
    }
    const [existing] = await connection_1.db
        .select({ id: Session_1.sessionStudentPdfs.id })
        .from(Session_1.sessionStudentPdfs)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.sessionId, sessionId), (0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.studentId, studentId)));
    if (!existing)
        throw new Errors_1.NotFound("Student PDF record not found");
    await connection_1.db.delete(Session_1.sessionStudentPdfs).where((0, drizzle_orm_1.eq)(Session_1.sessionStudentPdfs.id, existing.id));
    return (0, response_1.SuccessResponse)(res, { message: "Student PDF record deleted successfully" }, 200);
};
exports.deleteSessionStudentPdf = deleteSessionStudentPdf;
