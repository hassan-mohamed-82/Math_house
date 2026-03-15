import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import { sessionRatings, sessions, sessionUsers } from "../../models/schema/admin/Session";
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
import { eq, like, or, and, inArray, sql ,asc } from "drizzle-orm";
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
        lessonIds,
        studentIds
    } = req.body;

    if (
        !name ||
        !sessionDate ||
        !timeFrom ||
        !timeTo ||
        !type ||
        !teacherId ||
        !session_link ||
        !sessionRelationalType ||
        !lessonIds ||
        !Array.isArray(lessonIds) ||
        lessonIds.length === 0
    ) {
        throw new BadRequest("Missing or invalid required fields");
    }

    // Time Validations
    if (new Date(`${sessionDate}T${timeFrom}`) >= new Date(`${sessionDate}T${timeTo}`)) {
        throw new BadRequest("timeFrom must be before timeTo");
    }

    // Validations
    const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
    if (teacher.length === 0) {
        throw new BadRequest("Teacher not found");
    }

    const lessonsList = await db.select().from(lessons).where(inArray(lessons.id, lessonIds));
    if (lessonsList.length !== lessonIds.length) {
        throw new BadRequest("One or more lessons not found");
    }

    const sessionId = randomUUID();
    const lessonInserts = lessonIds.map((lessonId: string) => ({
        id: randomUUID(),
        sessionId,
        lessonId,
    }));

    switch (type) {
        case "private":
            if (!Array.isArray(studentIds) || studentIds.length !== 1) {
                throw new BadRequest("Private sessions must have exactly one student");
            }

            const student = await db.select().from(Student).where(eq(Student.id, studentIds[0])).limit(1);
            if (student.length === 0) {
                throw new BadRequest("Student not found");
            }

            await db.transaction(async (tx) => {
                await tx.insert(sessions).values({
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

                await tx.insert(sessionUsers).values({
                    id: randomUUID(),
                    sessionId,
                    studentId: studentIds[0],
                });

                // Bulk insert session lessons
                await tx.insert(sessionLessons).values(lessonInserts);
            });

            return SuccessResponse(res, { message: "Private session created successfully" }, 201);

        case "group":
            if (!groupId) {
                throw new BadRequest("Group sessions must have a groupId");
            }

            const group = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
            if (group.length === 0) {
                throw new BadRequest("Group not found");
            }

            const groupStudentsList = await db.select({ studentId: groupStudents.studentId })
                .from(groupStudents)
                .where(eq(groupStudents.groupId, groupId));

            // Merge group students with explicitly provided studentIds
            const uniqueStudentIds = new Set(groupStudentsList.map(gs => gs.studentId));
            if (Array.isArray(studentIds)) {
                studentIds.forEach(id => uniqueStudentIds.add(id));
            }

            const sessionUsersInserts = Array.from(uniqueStudentIds).map(id => ({
                id: randomUUID(),
                sessionId,
                studentId: id,
            }));

            await db.transaction(async (tx) => {
                await tx.insert(sessions).values({
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
                    await tx.insert(sessionUsers).values(sessionUsersInserts);
                }

                // Bulk insert session lessons
                await tx.insert(sessionLessons).values(lessonInserts);
            });

            return SuccessResponse(res, { message: "Group session created successfully" }, 201);

        default:
            throw new BadRequest("Invalid session type");
    }
};


export const getAllSessions = async (req: Request, res: Response) => {
    const sessionsList = await db.select({
        id: sessions.id,
        name: sessions.name,
        sessionDate: sessions.sessionDate,
        timeFrom: sessions.timeFrom,
        timeTo: sessions.timeTo,
        type: sessions.type,
        groupId: sessions.groupId,
        teacherId: sessions.teacherId,
        session_link: sessions.session_link,
        material_link: sessions.material_link,
        teacher_material_link: sessions.teacher_material_link,
        sessionRelationalType: sessions.sessionRelationalType,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        groups: {
            id: groups.id,
            name: groups.name,
        },
        teacher: {
            id: teachers.id,
            name: teachers.name,
        }
    })
    .from(sessions)
    .leftJoin(groups, eq(sessions.groupId, groups.id))
    .leftJoin(teachers, eq(sessions.teacherId, teachers.id));

    return SuccessResponse(res, { sessions: sessionsList }, 200);
}

export const getSessionById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const session = await db.select({
        id: sessions.id,
        name: sessions.name,
        sessionDate: sessions.sessionDate,
        timeFrom: sessions.timeFrom,
        timeTo: sessions.timeTo,
        type: sessions.type,
        groupId: sessions.groupId,
        teacherId: sessions.teacherId,
        session_link: sessions.session_link,
        material_link: sessions.material_link,
        teacher_material_link: sessions.teacher_material_link,
        sessionRelationalType: sessions.sessionRelationalType,
        createdAt: sessions.createdAt,
        updatedAt: sessions.updatedAt,
        groups: {
            id: groups.id,
            name: groups.name,
        },
        teacher: {
            id: teachers.id,
            name: teachers.name,
        },
    }).from(sessions)
    .leftJoin(groups, eq(sessions.groupId, groups.id))
    .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
    .where(eq(sessions.id, id)).limit(1);

    if (!session[0]) {
        throw new NotFound("Session not found");
    }

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
        }
    })
    .from(sessionLessons)
    .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
    .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
    .innerJoin(courses, eq(chapters.courseId, courses.id))
    .innerJoin(category, eq(courses.categoryId, category.id))
    .where(eq(sessionLessons.sessionId, id));

    const sessionStudentsData = await db.select({
        id: Student.id,
        name: sql<string>`CONCAT(${Student.firstname}, ' ', ${Student.lastname})`.as("name"),
    })
    .from(sessionUsers)
    .innerJoin(Student, eq(sessionUsers.studentId, Student.id))
    .where(eq(sessionUsers.sessionId, id));

    const responseData = {
        ...session[0],
        lessons: sessionLessonsData,
        students: sessionStudentsData
    };

    return SuccessResponse(res, { session: responseData }, 200);
};

export const updateSession = async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
        name,
        sessionDate,
        timeFrom,
        timeTo,
        teacherId,
        session_link,
        material_link,
        teacher_material_link,
        lessonIds,
        studentIds
    } = req.body;

    if (!id) {
        throw new BadRequest("Session ID is required");
    }

    const sessionExists = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    if (sessionExists.length === 0) {
        throw new NotFound("Session not found");
    }

    const currentSession = sessionExists[0];

    // Validate Teacher
    if (teacherId) {
        const teacher = await db.select().from(teachers).where(eq(teachers.id, teacherId)).limit(1);
        if (teacher.length === 0) {
            throw new BadRequest("Teacher not found");
        }
    }

    // Validate Lessons
    if (lessonIds && Array.isArray(lessonIds) && lessonIds.length > 0) {
        const lessonsList = await db.select().from(lessons).where(inArray(lessons.id, lessonIds));
        if (lessonsList.length !== lessonIds.length) {
            throw new BadRequest("One or more lessons not found");
        }
    }

    // Validate Time
    const newSessionDate = sessionDate || currentSession.sessionDate;
    const newTimeFrom = timeFrom || currentSession.timeFrom;
    const newTimeTo = timeTo || currentSession.timeTo;

    if (new Date(`${newSessionDate}T${newTimeFrom}`) >= new Date(`${newSessionDate}T${newTimeTo}`)) {
        throw new BadRequest("timeFrom must be before timeTo");
    }

    await db.transaction(async (tx) => {
        // Update basic session details
        await tx.update(sessions)
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
            .where(eq(sessions.id, id));

        // Update Lessons
        if (lessonIds && Array.isArray(lessonIds)) {
            // Remove existing
            await tx.delete(sessionLessons).where(eq(sessionLessons.sessionId, id));
            
            // Insert new ones
            if (lessonIds.length > 0) {
                const lessonInserts = lessonIds.map((lessonId: string) => ({
                    id: randomUUID(),
                    sessionId: id,
                    lessonId,
                }));
                await tx.insert(sessionLessons).values(lessonInserts);
            }
        }

        // Update Students (Merging logic based on session type)
        if (studentIds && Array.isArray(studentIds)) {
            if (currentSession.type === "private" && studentIds.length !== 1) {
                throw new BadRequest("Private sessions must have exactly one student");
            }

            // Verify students exist
            if (studentIds.length > 0) {
                const studentsList = await db.select().from(Student).where(inArray(Student.id, studentIds));
                if (studentsList.length !== studentIds.length) {
                    throw new BadRequest("One or more students not found");
                }
            }

            let finalStudentIds = [...studentIds];

            if (currentSession.type === "group" && currentSession.groupId) {
                // Ensure group students are always included and not accidentally removed
                const groupStudentsList = await tx.select({ studentId: groupStudents.studentId })
                    .from(groupStudents)
                    .where(eq(groupStudents.groupId, currentSession.groupId));
                    
                const uniqueStudentIds = new Set(groupStudentsList.map(gs => gs.studentId));
                studentIds.forEach(studentId => uniqueStudentIds.add(studentId));
                finalStudentIds = Array.from(uniqueStudentIds);
            }

            // Remove existing session users related to this session
            await tx.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));

            // Insert new merged list
            if (finalStudentIds.length > 0) {
                const sessionUsersInserts = finalStudentIds.map(studentId => ({
                    id: randomUUID(),
                    sessionId: id,
                    studentId,
                }));
                await tx.insert(sessionUsers).values(sessionUsersInserts);
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
        // Delete related entities first due to foreign keys constraints
        await tx.delete(sessionUsers).where(eq(sessionUsers.sessionId, id));
        await tx.delete(sessionLessons).where(eq(sessionLessons.sessionId, id));
        await tx.delete(sessionRatings).where(eq(sessionRatings.sessionId, id));
        await tx.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, id));
        // Final delete of the target session
        await tx.delete(sessions).where(eq(sessions.id, id));
    });

    return SuccessResponse(res, { message: "Session deleted successfully" }, 200);
};