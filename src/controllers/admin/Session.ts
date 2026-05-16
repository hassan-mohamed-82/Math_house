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
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";

// Selections
export const selectCategory = async (req: Request, res: Response) => {
    const allCategories = await db.select({
        id: category.id,
        name: category.name,
        parentCategoryId: category.parentCategoryId,
    }).from(category);

    const categoryMap = new Map<string, typeof allCategories[0]>();
    const parentIds = new Set<string>();

    allCategories.forEach(cat => {
        categoryMap.set(cat.id, cat);
        if (cat.parentCategoryId) {
            parentIds.add(cat.parentCategoryId);
        }
    });

    const leafCategories = allCategories.filter(cat => !parentIds.has(cat.id));

    const formattedCategories = leafCategories.map(leaf => {
        let current = leaf;
        const ancestors: string[] = [];

        while (current) {
            ancestors.unshift(current.name);
            if (current.parentCategoryId && categoryMap.has(current.parentCategoryId)) {
                current = categoryMap.get(current.parentCategoryId)!;
            } else {
                break;
            }
        }
        return {
            id: leaf.id,
            name: ancestors.join(" > "),
            root: ancestors[0] || leaf.name
        };
    });

    const groupedCategories = formattedCategories.reduce((acc: any, curr) => {
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

    return SuccessResponse(res, { categories: result });
};

export const selectSubCategory = async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    const parentCat = await db
        .select({ id: category.id })
        .from(category)
        .where(eq(category.id, categoryId))
        .limit(1);

    if (parentCat.length === 0) throw new BadRequest("Category not found");

    const subCategories = await db
        .select({ id: category.id, name: category.name })
        .from(category)
        .where(eq(category.parentCategoryId, categoryId));

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

export const createSession = async (req: Request, res: Response) => {
    const {
        name,
        scheduleType,           // "once" | "repeat"
        sessionDate,            // required when scheduleType === "once"
        startDate,              // required when scheduleType === "repeat"
        endDate,                // required when scheduleType === "repeat"
        timeFrom,
        timeTo,
        groupIds,               // string[] – optional, at least one of groupIds/studentIds required
        studentIds,             // string[] – optional, at least one of groupIds/studentIds required
        sessionRelationalType,
        categoryId,             // parent category ID
        subCategoryId,          // sub-category ID (must be child of categoryId)
        courseId,               // course ID (must belong to subCategoryId)
        chapterIds,             // string[] – chapters (must belong to courseId + subCategoryId)
        lessonIds,              // string[] – lessons (must belong to courseId + chapterIds + subCategoryId)
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
    } = req.body;

    // ── 1. Required field presence ────────────────────────────────────────
    if (
        !name ||
        !scheduleType ||
        !timeFrom ||
        !timeTo ||
        !teacherId ||
        !sessionRelationalType ||
        !categoryId ||
        !subCategoryId ||
        !courseId ||
        !Array.isArray(chapterIds) || chapterIds.length === 0 ||
        !Array.isArray(lessonIds) || lessonIds.length === 0
    ) {
        throw new BadRequest(
            "Missing or invalid required fields: name, scheduleType, timeFrom, timeTo, teacherId, sessionRelationalType, categoryId, subCategoryId, courseId, chapterIds[], lessonIds[]"
        );
    }

    // ── 2. At least groups or students must be provided ───────────────────
    const hasGroups = Array.isArray(groupIds) && groupIds.length > 0;
    const hasStudents = Array.isArray(studentIds) && studentIds.length > 0;

    if (!hasGroups && !hasStudents) {
        throw new BadRequest("You must provide at least one group (groupIds[]) or one student (studentIds[])");
    }

    // ── 3. Schedule type validation ───────────────────────────────────────
    if (!["once", "repeat"].includes(scheduleType)) {
        throw new BadRequest("scheduleType must be 'once' or 'repeat'");
    }

    if (scheduleType === "once") {
        if (!sessionDate) throw new BadRequest("sessionDate is required for one-time sessions");
    } else {
        if (!startDate || !endDate) {
            throw new BadRequest("startDate and endDate are required for recurring sessions");
        }
        if (new Date(startDate) >= new Date(endDate)) {
            throw new BadRequest("startDate must be before endDate");
        }
    }

    // ── 4. Time validation ────────────────────────────────────────────────
    const refDate = scheduleType === "once" ? sessionDate : startDate;
    if (new Date(`${refDate}T${timeFrom}`) >= new Date(`${refDate}T${timeTo}`)) {
        throw new BadRequest("timeFrom must be before timeTo");
    }

    // ── 5. Teacher validation ─────────────────────────────────────────────
    const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
    if (teacher.length === 0) throw new BadRequest("Teacher not found");

    // ── 6. Category hierarchy validation ─────────────────────────────────
    const parentCat = await db.select().from(category).where(eq(category.id, categoryId)).limit(1);
    if (parentCat.length === 0) throw new BadRequest("Category not found");

    const subCat = await db.select().from(category).where(eq(category.id, subCategoryId)).limit(1);
    if (subCat.length === 0) throw new BadRequest("Sub-category not found");
    if (subCat[0].parentCategoryId !== categoryId) {
        throw new BadRequest("Sub-category does not belong to the selected category");
    }

    // ── 7. Course validation (must belong to subCategoryId) ──────────────
    const course = await db
        .select()
        .from(courses)
        .where(and(eq(courses.id, courseId), eq(courses.categoryId, subCategoryId)))
        .limit(1);
    if (course.length === 0) {
        throw new BadRequest("Course does not belong to the selected sub-category");
    }

    // ── 8. Chapters validation ────────────────────────────────────────────
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

    // ── 9. Lessons validation ─────────────────────────────────────────────
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

    // ── 10. Groups validation ─────────────────────────────────────────────
    if (hasGroups) {
        const groupList = await db.select().from(groups).where(inArray(groups.id, groupIds));
        if (groupList.length !== groupIds.length) {
            throw new BadRequest("One or more groups not found");
        }
    }

    // ── 11. Students validation ───────────────────────────────────────────
    if (hasStudents) {
        const studentList = await db.select().from(Student).where(inArray(Student.id, studentIds));
        if (studentList.length !== studentIds.length) {
            throw new BadRequest("One or more students not found");
        }
    }

    // ── 12. Build session data ────────────────────────────────────────────
    const sessionId = randomUUID();

    const sessionData = {
        id: sessionId,
        name,
        scheduleType: scheduleType as "once" | "repeat",
        sessionDate: scheduleType === "once" ? sessionDate : null,
        startDate: scheduleType === "repeat" ? startDate : null,
        endDate: scheduleType === "repeat" ? endDate : null,
        timeFrom,
        timeTo,
        teacherId,
        session_link: session_link ?? null,
        material_link: material_link ?? null,
        teacher_material_link: teacher_material_link ?? null,
        sessionRelationalType: sessionRelationalType as "Explanation" | "Re-Explanation" | "Mistakes" | "Exam",
    };

    const lessonInserts = lessonIds.map((lessonId: string) => ({
        id: randomUUID(),
        sessionId,
        lessonId,
    }));

    // ── 13. Resolve all student IDs (group students + direct students) ────
    const uniqueStudentIds = new Set<string>(hasStudents ? studentIds : []);

    if (hasGroups) {
        const groupStudentsList = await db
            .select({ studentId: groupStudents.studentId })
            .from(groupStudents)
            .where(inArray(groupStudents.groupId, groupIds));
        groupStudentsList.forEach(gs => uniqueStudentIds.add(gs.studentId));
    }

    const sessionUsersInserts = Array.from(uniqueStudentIds).map(studentId => ({
        id: randomUUID(),
        sessionId,
        studentId,
    }));

    const sessionGroupsInserts = hasGroups
        ? groupIds.map((gId: string) => ({ id: randomUUID(), sessionId, groupId: gId }))
        : [];

    // ── 14. Persist everything in one transaction ─────────────────────────
    await db.transaction(async (tx) => {
        await tx.insert(sessions).values(sessionData);

        if (sessionGroupsInserts.length > 0) {
            await tx.insert(sessionGroups).values(sessionGroupsInserts);
        }

        if (sessionUsersInserts.length > 0) {
            await tx.insert(sessionUsers).values(sessionUsersInserts);
        }

        await tx.insert(sessionLessons).values(lessonInserts);
    });

    return SuccessResponse(res, { message: "Session created successfully" }, 201);
};

export const getAllSessions = async (req: Request, res: Response) => {
    const sessionsList = await db.select({
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
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        teacher: {
            id: teachers.id,
            name: teachers.name,
        }
    })
        .from(sessions)
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id));

    return SuccessResponse(res, { sessions: sessionsList }, 200);
}

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
        category: {
            id: category.id,
            name: category.name,
        },
    })
        .from(sessionLessons)
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
        .innerJoin(courses, eq(chapters.courseId, courses.id))
        .innerJoin(category, eq(courses.categoryId, category.id))
        .where(eq(sessionLessons.sessionId, id));

    // Fetch all students enrolled in this session
    const sessionStudentsData = await db.select({
        id: Student.id,
        name: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`.as("name"),
    })
        .from(sessionUsers)
        .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
        .where(eq(sessionUsers.sessionId, id));

    return SuccessResponse(res, {
        session: {
            ...session[0],
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
        scheduleType,
        sessionDate,
        startDate,
        endDate,
        timeFrom,
        timeTo,
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
        sessionRelationalType,
        groupIds,       // string[] – full replace of linked groups
        lessonIds,      // string[] – full replace of linked lessons
        studentIds      // string[] – full replace of direct students
    } = req.body;

    if (!id) {
        throw new BadRequest("Session ID is required");
    }

    const sessionExists = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (sessionExists.length === 0) {
        throw new NotFound("Session not found");
    }

    const currentSession = sessionExists[0];

    // Validate scheduleType transition
    const newScheduleType = scheduleType || currentSession.scheduleType;
    if (scheduleType && !(["once", "repeat"].includes(scheduleType))) {
        throw new BadRequest("scheduleType must be 'once' or 'repeat'");
    }
    if (newScheduleType === "once" && scheduleType && !sessionDate && !currentSession.sessionDate) {
        throw new BadRequest("sessionDate is required for one-time sessions");
    }
    if (newScheduleType === "repeat" && scheduleType) {
        const sd = startDate || currentSession.startDate;
        const ed = endDate || currentSession.endDate;
        if (!sd || !ed) throw new BadRequest("startDate and endDate are required for recurring sessions");
        if (new Date(sd) >= new Date(ed)) throw new BadRequest("startDate must be before endDate");
    }

    // Validate Teacher
    if (teacherId) {
        const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
        if (teacher.length === 0) throw new BadRequest("Teacher not found");
    }

    // Validate Lessons
    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
        const lessonsList = await db.select().from(lessons).where(inArray(lessons.id, lessonIds));
        if (lessonsList.length !== lessonIds.length) {
            throw new BadRequest("One or more lessons not found");
        }
    }

    // Validate Time
    const newSessionDate = sessionDate || currentSession.sessionDate || startDate || currentSession.startDate;
    const newTimeFrom = timeFrom || currentSession.timeFrom;
    const newTimeTo = timeTo || currentSession.timeTo;

    if (new Date(`${newSessionDate}T${newTimeFrom}`) >= new Date(`${newSessionDate}T${newTimeTo}`)) {
        throw new BadRequest("timeFrom must be before timeTo");
    }

    await db.transaction(async (tx) => {
        // Update basic session fields
        await tx.update(sessions)
            .set({
                ...(name && { name }),
                ...(scheduleType && { scheduleType }),
                ...(sessionDate && { sessionDate }),
                ...(startDate && { startDate }),
                ...(endDate && { endDate }),
                ...(timeFrom && { timeFrom }),
                ...(timeTo && { timeTo }),
                ...(teacherId && { teacherId }),
                ...(session_link && { session_link }),
                ...(material_link && { material_link }),
                ...(teacher_material_link && { teacher_material_link }),
                ...(sessionRelationalType && { sessionRelationalType }),
            })
            .where(eq(sessions.id, id));

        // Update Groups (full replace)
        if (groupIds && Array.isArray(groupIds)) {
            if (groupIds.length > 0) {
                const groupList = await db.select().from(groups).where(inArray(groups.id, groupIds));
                if (groupList.length !== groupIds.length) {
                    throw new BadRequest("One or more groups not found");
                }
            }
            await tx.delete(sessionGroups).where(eq(sessionGroups.sessionId, id));
            if (groupIds.length > 0) {
                await tx.insert(sessionGroups).values(
                    groupIds.map((gId: string) => ({ id: randomUUID(), sessionId: id, groupId: gId }))
                );
            }
        }

        // Update Lessons (full replace)
        if (lessonIds && Array.isArray(lessonIds)) {
            await tx.delete(sessionLessons).where(eq(sessionLessons.sessionId, id));
            if (lessonIds.length > 0) {
                await tx.insert(sessionLessons).values(
                    lessonIds.map((lessonId: string) => ({ id: randomUUID(), sessionId: id, lessonId }))
                );
            }
        }

        // Update Students – merge direct studentIds with students from ALL linked groups
        if (studentIds && Array.isArray(studentIds)) {
            if (studentIds.length > 0) {
                const studentsList = await db.select().from(Student).where(inArray(Student.id, studentIds));
                if (studentsList.length !== studentIds.length) {
                    throw new BadRequest("One or more students not found");
                }
            }

            // Build merged set: direct students + students from all currently linked groups
            const uniqueStudentIds = new Set<string>(studentIds);

            const linkedGroups = await tx
                .select({ groupId: sessionGroups.groupId })
                .from(sessionGroups)
                .where(eq(sessionGroups.sessionId, id));

            if (linkedGroups.length > 0) {
                const linkedGroupIds = linkedGroups.map(g => g.groupId);
                const groupStudentsList = await tx
                    .select({ studentId: groupStudents.studentId })
                    .from(groupStudents)
                    .where(inArray(groupStudents.groupId, linkedGroupIds));
                groupStudentsList.forEach(gs => uniqueStudentIds.add(gs.studentId));
            }

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

    await db.transaction(async (tx) => {
        // Delete related entities first due to foreign key constraints
        await tx.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));
        await tx.delete(sessionGroups).where(eq(sessionGroups.sessionId, id));
        await tx.delete(sessionLessons).where(eq(sessionLessons.sessionId, id));
        await tx.delete(sessionRatings).where(eq(sessionRatings.sessionId, id));
        await tx.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, id));
        // Final delete of the target session
        await tx.delete(sessions).where(eq(sessions.id, id));
    });

    return SuccessResponse(res, { message: "Session deleted successfully" }, 200);
};