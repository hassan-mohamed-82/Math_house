import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { sessionRatings, sessionGroups, sessions, sessionUsers } from "../../models/schema/admin/Session";
import { groups, groupStudents } from "../../models/schema/admin/Groups";
import {
    Student,
    teachers,
    category,
    courses,
    chapters,
    lessons,
    sessionLessons,
    sessionAttendance
} from "../../models/schema";
import { eq, like, or, and, inArray, sql, asc } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";

// Selections
export const selectCategory = async (req: Request, res: Response) => {
    const parentCategories = await db
        .select({ id: category.id, name: category.name })
        .from(category)
        .where(sql`${category.parentCategoryId} IS NULL`);

    return SuccessResponse(res, { categories: parentCategories });
};

export const selectSubCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.query;

    if (categoryId) {
        const parentCat = await db
            .select({ id: category.id })
            .from(category)
            .where(eq(category.id, categoryId as string))
            .limit(1);

        if (parentCat.length === 0) throw new BadRequest("Category not found");
    }

    const parentCategory = category.$inferSelect;
    const parentAlias = db.$with("parent").as(
        db.select({ id: category.id, name: category.name }).from(category)
    );

    const subCategories = await db
        .select({
            id: category.id,
            name: category.name,
            parentCategory: {
                id: sql<string>`parent.id`.as("parentId"),
                name: sql<string>`parent.name`.as("parentName"),
            },
        })
        .from(category)
        .leftJoin(
            sql`${category} as parent`,
            sql`${category.parentCategoryId} = parent.id`
        )
        .where(
            categoryId
                ? eq(category.parentCategoryId, categoryId as string)
                : sql`${category.parentCategoryId} IS NOT NULL`
        );

    return SuccessResponse(res, { subCategories });
};

export const selectCourse = async (req: Request, res: Response) => {
    const coursesList = await db.select({
        id: courses.id,
        name: courses.name,
        categoryId: courses.categoryId,
    }).from(courses).where(eq(courses.categoryId, req.params.categoryId));
    return SuccessResponse(res, { courses: coursesList });
};

export const selectChapter = async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const chaptersList = await db.select({
        id: chapters.id,
        name: chapters.name,
    }).from(chapters).where(eq(chapters.courseId, courseId));
    return SuccessResponse(res, { chapters: chaptersList });
};

export const selectLesson = async (req: Request, res: Response) => {
    const lessonsList = await db.select({
        id: lessons.id,
        name: lessons.name,
    }).from(lessons).where(eq(lessons.chapterId, req.params.chapterId));
    return SuccessResponse(res, { lessons: lessonsList });
};

type GradeType = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "13";

export const selectStudents = async (req: Request, res: Response) => {
    const { grade, categoryId, search } = req.query;

    const conditions = [];

    if (grade) {
        conditions.push(eq(Student.grade, grade as GradeType));
    }

    if (categoryId) {
        conditions.push(eq(Student.category, categoryId as string));
    }

    if (search) {
        const d_search = search as string;
        conditions.push(
            or(
                like(Student.firstname, `%${d_search}%`),
                like(Student.lastname, `%${d_search}%`),
                like(Student.email, `%${d_search}%`),
                like(Student.phone, `%${d_search}%`),
            )
        );
    }

    const studentsList = await db.select({
        id: Student.id,
        name: sql`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`.as("name"),
    })
        .from(Student)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

    return SuccessResponse(res, { students: studentsList });
};

export const selectTeachers = async (req: Request, res: Response) => {
    const teachersList = await db.select({
        id: teachers.id,
        name: teachers.name,
    }).from(teachers).orderBy(asc(teachers.name));
    return SuccessResponse(res, { teachers: teachersList });
};

export const selectGroups = async (req: Request, res: Response) => {
    const groupsList = await db.select({
        id: groups.id,
        name: groups.name,
    }).from(groups).orderBy(asc(groups.name));
    return SuccessResponse(res, { groups: groupsList });
};

// كائن تحويل الأسماء النصية للأيام إلى الأرقام المقابلة لها في JavaScript
const daysMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
};

// دالة مساعدة لتوليد التواريخ الموافقة للأيام المطلوبة في حالة التكرار
function getRecurringDates(startDate: string, endDate: string, allowedDays: number[]): string[] {
    const dates: string[] = [];
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

export const createSession = async (req: Request, res: Response) => {
    const {
        name,
        scheduleType,           // "once" | "repeat"
        sessionDate,            // required when scheduleType === "once"
        timeFrom,               // required when scheduleType === "once"
        timeTo,                 // required when scheduleType === "once"
        startDate,              // required when scheduleType === "repeat"
        endDate,                // required when scheduleType === "repeat"
        recurringDays,          // required when scheduleType === "repeat" -> Array of { dayOfWeek: string, timeFrom: string, timeTo: string }
        groupIds,               // string[] – optional
        studentIds,             // string[] – optional
        sessionRelationalType,
        categoryId,             // parent category ID
        subCategoryId,          // sub-category ID (must be child of categoryId)
        courseId,               // course ID (must belong to subCategoryId)
        chapterIds,             // string[] – chapters
        lessonIds,              // string[] – lessons
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
        contentAccessDays,      // number | null – days students can access content after attending (null = permanent)
    } = req.body;

    // ── 1. Required field presence (General fields) ────────────────────────
    if (
        !name ||
        !scheduleType ||
        !teacherId ||
        !sessionRelationalType ||
        !categoryId ||
        !subCategoryId ||
        !courseId ||
        !Array.isArray(chapterIds) || chapterIds.length === 0 ||
        !Array.isArray(lessonIds) || lessonIds.length === 0
    ) {
        throw new BadRequest(
            "Missing or invalid required fields: name, scheduleType, teacherId, sessionRelationalType, categoryId, subCategoryId, courseId, chapterIds[], lessonIds[]"
        );
    }

    // ── 2. At least groups or students must be provided ───────────────────
    const hasGroups = Array.isArray(groupIds) && groupIds.length > 0;
    const hasStudents = Array.isArray(studentIds) && studentIds.length > 0;

    if (!hasGroups && !hasStudents) {
        throw new BadRequest("You must provide at least one group (groupIds[]) or one student (studentIds[])");
    }

    // ── 3. Schedule type and Time validation ───────────────────────────────────────
    if (!["once", "repeat"].includes(scheduleType)) {
        throw new BadRequest("scheduleType must be 'once' or 'repeat'");
    }

    // إنشاء مصفوفة لتجهيز التواريخ والأوقات الجاهزة للإنشاء الحقيقي
    let targetSchedules: { date: string; from: string; to: string }[] = [];

    if (scheduleType === "once") {
        if (!sessionDate || !timeFrom || !timeTo) {
            throw new BadRequest("sessionDate, timeFrom, and timeTo are required for one-time sessions");
        }
        if (new Date(`${sessionDate}T${timeFrom}`) >= new Date(`${sessionDate}T${timeTo}`)) {
            throw new BadRequest("timeFrom must be before timeTo");
        }
        targetSchedules.push({ date: sessionDate, from: timeFrom, to: timeTo });
    } else {
        if (!startDate || !endDate) {
            throw new BadRequest("startDate and endDate are required for recurring sessions");
        }
        if (new Date(startDate) >= new Date(endDate)) {
            throw new BadRequest("startDate must be before endDate");
        }
        if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
            throw new BadRequest("recurringDays array is required and cannot be empty for recurring sessions");
        }

        // تحويل أسماء الأيام النصية القادمة من الـ Front-end إلى أرقام المقابلة لها
        const allowedDays = recurringDays.map((d: any) => {
            if (!d.dayOfWeek || typeof d.dayOfWeek !== "string") {
                throw new BadRequest("dayOfWeek must be a valid string name (e.g., 'Monday')");
            }
            const dayNum = daysMap[d.dayOfWeek.toLowerCase()];
            if (dayNum === undefined) {
                throw new BadRequest(`Invalid day name provided: ${d.dayOfWeek}`);
            }
            return dayNum;
        });

        const generatedDates = getRecurringDates(startDate, endDate, allowedDays);

        // ربط كل تاريخ ناتج بالوقت الخاص باليوم بتاعه المبعوث في الـ body
        generatedDates.forEach((dateStr) => {
            const currentDayNum = new Date(dateStr).getDay();
            const config = recurringDays.find(
                (d: any) => daysMap[d.dayOfWeek.toLowerCase()] === currentDayNum
            );
            if (config) {
                targetSchedules.push({ date: dateStr, from: config.timeFrom, to: config.timeTo });
            }
        });

        if (targetSchedules.length === 0) {
            throw new BadRequest("No valid session dates could be generated with the provided range and days");
        }
    }

    // ── 4. Teacher validation ─────────────────────────────────────────────
    const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
    if (teacher.length === 0) throw new BadRequest("Teacher not found");

    // ── 5. Category hierarchy validation ─────────────────────────────────
    const parentCat = await db.select().from(category).where(eq(category.id, categoryId)).limit(1);
    if (parentCat.length === 0) throw new BadRequest("Category not found");

    const subCat = await db.select().from(category).where(eq(category.id, subCategoryId)).limit(1);
    if (subCat.length === 0) throw new BadRequest("Sub-category not found");
    if (subCat[0].parentCategoryId !== categoryId) {
        throw new BadRequest("Sub-category does not belong to the selected category");
    }

    // ── 6. Course validation (must belong to subCategoryId) ──────────────
    const course = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.categoryId, subCategoryId)))
        .limit(1);
    if (course.length === 0) {
        throw new BadRequest("Course does not belong to the selected sub-category");
    }

    // ── 7. Chapters validation ────────────────────────────────────────────
    const chaptersList = await db.select().from(chapters).where(inArray(chapters.id, chapterIds));
    if (chaptersList.length !== chapterIds.length) {
        throw new BadRequest("One or more chapters not found");
    }

    const invalidChapters = chaptersList.filter(
        ch => ch.courseId !== courseId || ch.categoryId !== subCategoryId
    );
    if (invalidChapters.length > 0) {
        throw new BadRequest(
            `Chapters [${invalidChapters.map(c => c.id).join(", ")}] do not belong to the selected course / sub-category`
        );
    }

    // ── 8. Lessons validation ─────────────────────────────────────────────
    const lessonsList = await db.select().from(lessons).where(inArray(lessons.id, lessonIds));
    if (lessonsList.length !== lessonIds.length) {
        throw new BadRequest("One or more lessons not found");
    }

    const chapterIdSet = new Set<string>(chapterIds);
    const invalidLessons = lessonsList.filter(
        l => l.courseId !== courseId || l.categoryId !== subCategoryId || !chapterIdSet.has(l.chapterId)
    );
    if (invalidLessons.length > 0) {
        throw new BadRequest(
            `Lessons [${invalidLessons.map(l => l.id).join(", ")}] do not belong to the selected course / chapters / sub-category`
        );
    }

    // ── 9. Groups validation ─────────────────────────────────────────────
    if (hasGroups) {
        const groupList = await db.select().from(groups).where(inArray(groups.id, groupIds));
        if (groupList.length !== groupIds.length) {
            throw new BadRequest("One or more groups not found");
        }
    }

    // ── 10. Students validation ───────────────────────────────────────────
    if (hasStudents) {
        const studentList = await db.select().from(Student).where(inArray(Student.id, studentIds));
        if (studentList.length !== studentIds.length) {
            throw new BadRequest("One or more students not found");
        }
    }

    // ── 11. Resolve all student IDs (group students + direct students) ────
    const uniqueStudentIds = new Set<string>(hasStudents ? studentIds : []);

    if (hasGroups) {
        const groupStudentsList = await db
            .select({ studentId: groupStudents.studentId })
            .from(groupStudents)
            .where(inArray(groupStudents.groupId, groupIds));
        groupStudentsList.forEach(gs => uniqueStudentIds.add(gs.studentId));
    }

    // ── 12. Build arrays for Bulk Insertion ───────────────────────────────────
    const sessionsToInsert: any[] = [];
    const lessonInserts: any[] = [];
    const sessionUsersInserts: any[] = [];
    const sessionGroupsInserts: any[] = [];

    for (const schedule of targetSchedules) {
        const sessionId = randomUUID();

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
            contentAccessDays: contentAccessDays != null ? Number(contentAccessDays) : null,
        });

        // ربط الدروس بالحصة الحالية
        lessonIds.forEach((lessonId: string) => {
            lessonInserts.push({
                id: randomUUID(),
                sessionId,
                lessonId,
            });
        });

        // ربط الطلاب المستهدفين بالحصة الحالية
        Array.from(uniqueStudentIds).forEach((studentId) => {
            sessionUsersInserts.push({
                id: randomUUID(),
                sessionId,
                studentId,
            });
        });

        // ربط المجموعات المستهدفة بالحصة الحالية
        if (hasGroups) {
            groupIds.forEach((gId: string) => {
                sessionGroupsInserts.push({
                    id: randomUUID(),
                    sessionId,
                    groupId: gId,
                });
            });
        }
    }

    // ── 13. Persist everything in one clean transaction ─────────────────────────
    await db.transaction(async (tx) => {
        await tx.insert(sessions).values(sessionsToInsert);

        if (sessionGroupsInserts.length > 0) {
            await tx.insert(sessionGroups).values(sessionGroupsInserts);
        }

        if (sessionUsersInserts.length > 0) {
            await tx.insert(sessionUsers).values(sessionUsersInserts);
        }

        await tx.insert(sessionLessons).values(lessonInserts);
    });

    return SuccessResponse(res, { message: `${sessionsToInsert.length} session(s) created successfully` }, 201);
};

export const getAllSessions = async (req: Request, res: Response) => {
    // Fetch base session list with teacher info
    const sessionsList = await db.select({
        id: sessions.id,
        name: sessions.name,
        scheduleType: sessions.scheduleType,
        sessionDate: sessions.sessionDate,
        startDate: sessions.startDate,
        endDate: sessions.endDate,
        timeFrom: sessions.timeFrom,
        timeTo: sessions.timeTo,
        sessionRelationalType: sessions.sessionRelationalType,
        session_link: sessions.session_link,
        material_link: sessions.material_link,
        teacher_material_link: sessions.teacher_material_link,
        contentAccessDays: sessions.contentAccessDays,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        teacher: {
            id: teachers.id,
            name: teachers.name,
        },
    })
        .from(sessions)
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .orderBy(sessions.createdAt);

    // For each session, attach a lightweight groups + students summary
    const sessionIds = sessionsList.map(s => s.id);

    const groupsSummary = sessionIds.length > 0
        ? await db.select({
            sessionId: sessionGroups.sessionId,
            groupId:   groups.id,
            groupName: groups.name,
        })
            .from(sessionGroups)
            .innerJoin(groups, eq(sessionGroups.groupId, groups.id))
            .where(inArray(sessionGroups.sessionId, sessionIds))
        : [];

    const studentsSummary = sessionIds.length > 0
        ? await db.select({
            sessionId: sessionUsers.sessionId,
            studentId: Student.id,
            studentName: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`.as("studentName"),
        })
            .from(sessionUsers)
            .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
            .where(inArray(sessionUsers.sessionId, sessionIds))
        : [];

    // Map summaries by sessionId
    const groupsBySession = new Map<string, { id: string; name: string }[]>();
    groupsSummary.forEach(g => {
        if (!groupsBySession.has(g.sessionId)) groupsBySession.set(g.sessionId, []);
        groupsBySession.get(g.sessionId)!.push({ id: g.groupId, name: g.groupName });
    });

    const studentsBySession = new Map<string, { id: string; name: string }[]>();
    studentsSummary.forEach(s => {
        if (!studentsBySession.has(s.sessionId)) studentsBySession.set(s.sessionId, []);
        studentsBySession.get(s.sessionId)!.push({ id: s.studentId, name: s.studentName });
    });

    const result = sessionsList.map(session => ({
        ...session,
        groups:        groupsBySession.get(session.id)   ?? [],
        groupCount:    groupsBySession.get(session.id)?.length  ?? 0,
        students:      studentsBySession.get(session.id) ?? [],
        studentCount:  studentsBySession.get(session.id)?.length ?? 0,
    }));

    return SuccessResponse(res, { sessions: result }, 200);
};

export const getSessionById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const session = await db.select({
        id: sessions.id,
        name: sessions.name,
        scheduleType: sessions.scheduleType,
        sessionDate: sessions.sessionDate,
        startDate: sessions.startDate,
        endDate: sessions.endDate,
        timeFrom: sessions.timeFrom,
        timeTo: sessions.timeTo,
        teacherId: sessions.teacherId,
        session_link: sessions.session_link,
        material_link: sessions.material_link,
        teacher_material_link: sessions.teacher_material_link,
        sessionRelationalType: sessions.sessionRelationalType,
        contentAccessDays: sessions.contentAccessDays,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        teacher: {
            id: teachers.id,
            name: teachers.name,
        },
    })
        .from(sessions)
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(eq(sessions.id, id))
        .limit(1);

    if (!session[0]) {
        throw new NotFound("Session not found");
    }

    // Fetch linked groups via junction table
    const sessionGroupsData = await db.select({
        id: groups.id,
        name: groups.name,
    })
        .from(sessionGroups)
        .innerJoin(groups, eq(sessionGroups.groupId, groups.id))
        .where(eq(sessionGroups.sessionId, id));

    // Fetch linked lessons with full academic hierarchy
    const parentCategory = alias(category, 'parentCategory');
    const sessionLessonsData = await db.select({
        id: lessons.id,
        name: lessons.name,
        chapter: {
            id: chapters.id,
            name: chapters.name,
        },
        course: {
            id: courses.id,
            name: courses.name,
        },
        subcategory: {
            id: category.id,
            name: category.name,
        },
        category: {
            id: parentCategory.id,
            name: parentCategory.name,
        },
    })
        .from(sessionLessons)
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
        .innerJoin(courses, eq(chapters.courseId, courses.id))
        .innerJoin(category, eq(courses.categoryId, category.id))
        .leftJoin(parentCategory, eq(category.parentCategoryId, parentCategory.id))
        .where(eq(sessionLessons.sessionId, id));

    // Fetch all students enrolled in this session
    const sessionStudentsData = await db.select({
        id: Student.id,
        name: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`.as("name"),
    })
        .from(sessionUsers)
        .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
        .where(eq(sessionUsers.sessionId, id));

    // If it's a repeated session, we should try to fetch the other sessions in the same batch
    // to reconstruct the recurringDays array for the frontend.
    let recurringDays: any[] = [];
    if (session[0].scheduleType === "repeat" && session[0].startDate && session[0].endDate) {
        // Find all sessions with the same name, start/end dates, and teacher
        const relatedSessions = await db.select({
            sessionDate: sessions.sessionDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
        })
        .from(sessions)
        .where(and(
            eq(sessions.scheduleType, "repeat"),
            eq(sessions.startDate, session[0].startDate),
            eq(sessions.endDate, session[0].endDate),
            eq(sessions.teacherId, session[0].teacherId)
        ));

        // Group by day of week
        const daysMapReverse: Record<number, string> = {
            0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"
        };
        
        const uniqueDays = new Map<number, any>();
        
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

    return SuccessResponse(res, {
        session: {
            ...session[0],
            recurringDays: recurringDays.length > 0 ? recurringDays : undefined,
            groups: sessionGroupsData,
            lessons: sessionLessonsData,
            students: sessionStudentsData,
        },
    }, 200);
};

export const updateSession = async (req: Request, res: Response) => {
    const { id } = req.params;

    const {
        name,
        scheduleType,           // "once" | "repeat"
        sessionDate,            // required when scheduleType === "once"
        timeFrom,               // required when scheduleType === "once"
        timeTo,                 // required when scheduleType === "once"
        startDate,              // required when scheduleType === "repeat"
        endDate,                // required when scheduleType === "repeat"
        recurringDays,          // required when scheduleType === "repeat" → [{ dayOfWeek, timeFrom, timeTo }]
        groupIds,               // string[] – full replace of linked groups
        studentIds,             // string[] – full replace of direct students
        sessionRelationalType,
        categoryId,
        subCategoryId,
        courseId,
        chapterIds,             // string[] – full replace of linked chapters
        lessonIds,              // string[] – full replace of linked lessons
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
        contentAccessDays,      // number | null | undefined – omit to leave unchanged
    } = req.body;

    // ── 1. Session must exist ─────────────────────────────────────────────
    if (!id) throw new BadRequest("Session ID is required");

    const sessionExists = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (sessionExists.length === 0) throw new NotFound("Session not found");

    const currentSession = sessionExists[0];

    // ── 2. Required fields (only validate what is being changed) ─────────
    // Core identity fields: if any academic field is provided, all must be present
    const isChangingAcademics = categoryId || subCategoryId || courseId || chapterIds || lessonIds;
    if (isChangingAcademics) {
        if (
            !categoryId ||
            !subCategoryId ||
            !courseId ||
            !Array.isArray(chapterIds) || chapterIds.length === 0 ||
            !Array.isArray(lessonIds)  || lessonIds.length === 0
        ) {
            throw new BadRequest(
                "When updating academic content, all of categoryId, subCategoryId, courseId, chapterIds[], lessonIds[] must be provided together"
            );
        }
    }

    // ── 3. At least one audience if being changed ─────────────────────────
    const isChangingAudience = groupIds !== undefined || studentIds !== undefined;
    if (isChangingAudience) {
        const hasGroups   = Array.isArray(groupIds)   && groupIds.length   > 0;
        const hasStudents = Array.isArray(studentIds)  && studentIds.length > 0;
        if (!hasGroups && !hasStudents) {
            throw new BadRequest("You must provide at least one group (groupIds[]) or one student (studentIds[])");
        }
    }

    // ── 4. Schedule type and time validation ─────────────────────────────
    // Determine the effective schedule type (new or existing)
    const effectiveScheduleType = scheduleType ?? currentSession.scheduleType;

    let targetSchedules: { date: string; from: string; to: string }[] = [];
    const isChangingSchedule = !!(scheduleType || sessionDate || timeFrom || timeTo || startDate || endDate || recurringDays);

    if (isChangingSchedule) {
        if (!["once", "repeat"].includes(effectiveScheduleType)) {
            throw new BadRequest("scheduleType must be 'once' or 'repeat'");
        }

        if (effectiveScheduleType === "once") {
            const date = sessionDate ?? currentSession.sessionDate;
            const from = timeFrom    ?? currentSession.timeFrom;
            const to   = timeTo      ?? currentSession.timeTo;

            if (!date || !from || !to) {
                throw new BadRequest("sessionDate, timeFrom, and timeTo are required for one-time sessions");
            }
            if (new Date(`${date}T${from}`) >= new Date(`${date}T${to}`)) {
                throw new BadRequest("timeFrom must be before timeTo");
            }
            targetSchedules.push({ date, from, to });
        } else {
            // repeat
            const sd = startDate ?? currentSession.startDate;
            const ed = endDate   ?? currentSession.endDate;

            if (!sd || !ed) throw new BadRequest("startDate and endDate are required for recurring sessions");
            if (new Date(sd) >= new Date(ed)) throw new BadRequest("startDate must be before endDate");

            if (!Array.isArray(recurringDays) || recurringDays.length === 0) {
                throw new BadRequest("recurringDays array is required and cannot be empty for recurring sessions");
            }

            const allowedDays = recurringDays.map((d: any) => {
                if (!d.dayOfWeek || typeof d.dayOfWeek !== "string") {
                    throw new BadRequest("dayOfWeek must be a valid string name (e.g., 'Monday')");
                }
                const dayNum = daysMap[d.dayOfWeek.toLowerCase()];
                if (dayNum === undefined) throw new BadRequest(`Invalid day name provided: ${d.dayOfWeek}`);
                return dayNum;
            });

            const generatedDates = getRecurringDates(sd, ed, allowedDays);

            generatedDates.forEach((dateStr) => {
                const currentDayNum = new Date(dateStr).getDay();
                const config = recurringDays.find(
                    (d: any) => daysMap[d.dayOfWeek.toLowerCase()] === currentDayNum
                );
                if (config) {
                    targetSchedules.push({ date: dateStr, from: config.timeFrom, to: config.timeTo });
                }
            });

            if (targetSchedules.length === 0) {
                throw new BadRequest("No valid session dates could be generated with the provided range and days");
            }
        }
    }

    // ── 5. Teacher validation ─────────────────────────────────────────────
    if (teacherId) {
        const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
        if (teacher.length === 0) throw new BadRequest("Teacher not found");
    }

    // ── 6. Category hierarchy validation ─────────────────────────────────
    if (isChangingAcademics) {
        const parentCat = await db.select().from(category).where(eq(category.id, categoryId)).limit(1);
        if (parentCat.length === 0) throw new BadRequest("Category not found");

        const subCat = await db.select().from(category).where(eq(category.id, subCategoryId)).limit(1);
        if (subCat.length === 0) throw new BadRequest("Sub-category not found");
        if (subCat[0].parentCategoryId !== categoryId) {
            throw new BadRequest("Sub-category does not belong to the selected category");
        }

        // ── 7. Course validation ──────────────────────────────────────────
        const course = await db
            .select()
            .from(courses)
            .where(and(eq(courses.id, courseId), eq(courses.categoryId, subCategoryId)))
            .limit(1);
        if (course.length === 0) throw new BadRequest("Course does not belong to the selected sub-category");

        // ── 8. Chapters validation ────────────────────────────────────────
        const chaptersList = await db.select().from(chapters).where(inArray(chapters.id, chapterIds));
        if (chaptersList.length !== chapterIds.length) throw new BadRequest("One or more chapters not found");

        const invalidChapters = chaptersList.filter(
            ch => ch.courseId !== courseId || ch.categoryId !== subCategoryId
        );
        if (invalidChapters.length > 0) {
            throw new BadRequest(
                `Chapters [${invalidChapters.map(c => c.id).join(", ")}] do not belong to the selected course / sub-category`
            );
        }

        // ── 9. Lessons validation ─────────────────────────────────────────
        const lessonsList = await db.select().from(lessons).where(inArray(lessons.id, lessonIds));
        if (lessonsList.length !== lessonIds.length) throw new BadRequest("One or more lessons not found");

        const chapterIdSet = new Set<string>(chapterIds);
        const invalidLessons = lessonsList.filter(
            l => l.courseId !== courseId || l.categoryId !== subCategoryId || !chapterIdSet.has(l.chapterId)
        );
        if (invalidLessons.length > 0) {
            throw new BadRequest(
                `Lessons [${invalidLessons.map(l => l.id).join(", ")}] do not belong to the selected course / chapters / sub-category`
            );
        }
    }

    // ── 10. Groups validation ─────────────────────────────────────────────
    const hasGroups   = Array.isArray(groupIds)   && groupIds.length   > 0;
    const hasStudents = Array.isArray(studentIds)  && studentIds.length > 0;

    if (hasGroups) {
        const groupList = await db.select().from(groups).where(inArray(groups.id, groupIds));
        if (groupList.length !== groupIds.length) throw new BadRequest("One or more groups not found");
    }

    // ── 11. Students validation ───────────────────────────────────────────
    if (hasStudents) {
        const studentList = await db.select().from(Student).where(inArray(Student.id, studentIds));
        if (studentList.length !== studentIds.length) throw new BadRequest("One or more students not found");
    }

    // ── 12. Resolve merged student set ────────────────────────────────────
    // Only compute when audience is being changed
    let uniqueStudentIds: Set<string> | null = null;

    if (isChangingAudience) {
        uniqueStudentIds = new Set<string>(hasStudents ? studentIds : []);

        if (hasGroups) {
            const groupStudentsList = await db
                .select({ studentId: groupStudents.studentId })
                .from(groupStudents)
                .where(inArray(groupStudents.groupId, groupIds));
            groupStudentsList.forEach(gs => uniqueStudentIds!.add(gs.studentId));
        }
    }

    // ── 13. Persist in one transaction ───────────────────────────────────
    await db.transaction(async (tx) => {
        // 13a. Update core session fields
        const scheduleFields = isChangingSchedule && targetSchedules.length === 1
            ? {
                scheduleType: effectiveScheduleType as "once" | "repeat",
                sessionDate: targetSchedules[0].date,
                startDate: effectiveScheduleType === "repeat" ? (startDate ?? currentSession.startDate) : null,
                endDate:   effectiveScheduleType === "repeat" ? (endDate   ?? currentSession.endDate)   : null,
                timeFrom: targetSchedules[0].from,
                timeTo:   targetSchedules[0].to,
            }
            : {};  // for repeat with many dates we only update metadata, not date/time (multiple rows)

        await tx.update(sessions)
            .set({
                ...(name                  && { name }),
                ...(scheduleType          && { scheduleType }),
                ...(session_link          && { session_link }),
                ...(material_link         && { material_link }),
                ...(teacher_material_link && { teacher_material_link }),
                ...(sessionRelationalType && { sessionRelationalType }),
                ...(teacherId             && { teacherId }),
                // Allow explicit null to clear the expiry (permanent access)
                ...(contentAccessDays !== undefined && {
                    contentAccessDays: contentAccessDays != null ? Number(contentAccessDays) : null,
                }),
                ...scheduleFields,
            })
            .where(eq(sessions.id, id));

        // 13b. Full replace of lessons
        if (isChangingAcademics) {
            await tx.delete(sessionLessons).where(eq(sessionLessons.sessionId, id));
            await tx.insert(sessionLessons).values(
                lessonIds.map((lessonId: string) => ({ id: randomUUID(), sessionId: id, lessonId }))
            );
        }

        // 13c. Full replace of groups
        if (groupIds !== undefined && Array.isArray(groupIds)) {
            await tx.delete(sessionGroups).where(eq(sessionGroups.sessionId, id));
            if (hasGroups) {
                await tx.insert(sessionGroups).values(
                    groupIds.map((gId: string) => ({ id: randomUUID(), sessionId: id, groupId: gId }))
                );
            }
        }

        // 13d. Full replace of students (direct + from groups)
        if (isChangingAudience && uniqueStudentIds) {
            await tx.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));
            if (uniqueStudentIds.size > 0) {
                await tx.insert(sessionUsers).values(
                    Array.from(uniqueStudentIds).map(studentId => ({ id: randomUUID(), sessionId: id, studentId }))
                );
            }
        }
    });

    return SuccessResponse(res, { message: "Session updated successfully" }, 200);
};


export const deleteSession = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Session ID is required");
    }

    const sessionExists = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (sessionExists.length === 0) {
        throw new NotFound("Session not found");
    }

    const targetSession = sessionExists[0];
    let sessionIdsToDelete = [id];

    // If it's a repeated session, find all related sessions in the same series
    if (targetSession.scheduleType === "repeat" && targetSession.startDate && targetSession.endDate) {
        const relatedSessions = await db.select({ id: sessions.id })
            .from(sessions)
            .where(and(
                eq(sessions.scheduleType, "repeat"),
                eq(sessions.startDate, targetSession.startDate),
                eq(sessions.endDate, targetSession.endDate),
                eq(sessions.teacherId, targetSession.teacherId)
            ));
        
        sessionIdsToDelete = relatedSessions.map(s => s.id);
    }

    await db.transaction(async (tx) => {
        // Delete related entities for all targeted sessions first due to foreign key constraints
        await tx.delete(sessionUsers).where(inArray(sessionUsers.sessionId, sessionIdsToDelete));
        await tx.delete(sessionGroups).where(inArray(sessionGroups.sessionId, sessionIdsToDelete));
        await tx.delete(sessionLessons).where(inArray(sessionLessons.sessionId, sessionIdsToDelete));
        await tx.delete(sessionRatings).where(inArray(sessionRatings.sessionId, sessionIdsToDelete));
        await tx.delete(sessionAttendance).where(inArray(sessionAttendance.sessionId, sessionIdsToDelete));
        // Final delete of the target sessions
        await tx.delete(sessions).where(inArray(sessions.id, sessionIdsToDelete));
    });

    return SuccessResponse(res, { message: `Successfully deleted ${sessionIdsToDelete.length} session(s)` }, 200);
};


export const getStudentsCourseAttendance = async (req: Request, res: Response) => {
    const { studentIds, courseId } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
        throw new BadRequest("studentIds array is required");
    }

    if (!courseId) {
        throw new BadRequest("courseId is required");
    }

    // Query: get all present attendance records with lesson/chapter info
    const attendanceRecords = await db
        .select({
            studentId: Student.id,
            studentFirstName: Student.firstname,
            studentLastName: Student.lastname,
            chapterId: chapters.id,
            chapterName: chapters.name,
            lessonId: lessons.id,
            lessonName: lessons.name,
        })
        .from(sessionAttendance)
        .innerJoin(Student, eq(sessionAttendance.studentId, Student.id))
        .innerJoin(sessions, eq(sessionAttendance.sessionId, sessions.id))
        .innerJoin(sessionLessons, eq(sessionLessons.sessionId, sessions.id))
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
        .innerJoin(courses, eq(chapters.courseId, courses.id))
        .where(
            and(
                inArray(sessionAttendance.studentId, studentIds),
                eq(sessionAttendance.status, "present"),
                eq(courses.id, courseId)
            )
        );

    // Build nested structure: student → chapters → lessons
    const studentAttendanceById = new Map<string, any>();

    for (const record of attendanceRecords) {
        // Initialize student entry if not exists
        if (!studentAttendanceById.has(record.studentId)) {
            studentAttendanceById.set(record.studentId, {
                studentId: record.studentId,
                studentName: `${record.studentFirstName} ${record.studentLastName}`,
                chaptersById: new Map<string, any>(),
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
        const isLessonAlreadyAdded = chapterAttendance.lessons.some(
            (lesson: any) => lesson.id === record.lessonId
        );

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

    return SuccessResponse(res, { students: studentsWithAttendance }, 200);
};