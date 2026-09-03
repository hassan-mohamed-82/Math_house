import { Request, Response } from "express";
import { db } from "../../models/connection";
import { sessions, sessionLessons, sessionUsers, sessionGroups, sessionAttendance } from "../../models/schema/admin/Session";
import { lessons, lessonIdeas, chapters, courses, teachers } from "../../models/schema";
import { groups, groupStudents } from "../../models/schema/admin/Groups";
import { Student } from "../../models/schema/admin/Student";
import { eq, and, or, inArray, sql, desc, asc } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError } from "../../Errors";
import { generateSecureStreamUrl } from "../../drive/services/services";

// ── helpers ──────────────────────────────────────────────────────────────────

const getTeacherId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

const resolveIdea = (idea: {
    id: string;
    idea: string;
    ideaOrder: number;
    pdf: string | null;
    video: string | null;
    bunnyGuid: string | null;
}) => {
    const { bunnyGuid, video, ...rest } = idea;
    let videoPayload: { type: "bunny"; streamUrl: string } | { type: "external"; url: string } | null = null;
    if (bunnyGuid) {
        videoPayload = { type: "bunny", streamUrl: generateSecureStreamUrl(bunnyGuid) };
    } else if (video) {
        videoPayload = { type: "external", url: video };
    }
    return { ...rest, video: videoPayload };
};

/**
 * Fetches lessons (with ideas) for a list of sessionIds, grouped by sessionId.
 */
async function fetchSessionResources(sessionIds: string[]) {
    if (sessionIds.length === 0) return new Map<string, any[]>();

    // Lessons attached to sessions
    const sessionLessonsRows = await db
        .select({
            sessionId: sessionLessons.sessionId,
            lesson: {
                id: lessons.id,
                name: lessons.name,
                description: lessons.description,
                image: lessons.image,
                order: lessons.order,
            },
            chapter: {
                id: chapters.id,
                name: chapters.name,
            },
            course: {
                id: courses.id,
                name: courses.name,
            },
        })
        .from(sessionLessons)
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .leftJoin(chapters, eq(lessons.chapterId, chapters.id))
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .where(inArray(sessionLessons.sessionId, sessionIds));

    // Unique lesson IDs to fetch ideas
    const lessonIds = Array.from(new Set(sessionLessonsRows.map(r => r.lesson.id)));

    let ideasByLesson = new Map<string, any[]>();
    if (lessonIds.length > 0) {
        const ideas = await db
            .select({
                id: lessonIdeas.id,
                lessonId: lessonIdeas.lessonId,
                idea: lessonIdeas.idea,
                ideaOrder: lessonIdeas.ideaOrder,
                pdf: lessonIdeas.pdf,
                video: lessonIdeas.video,
                bunnyGuid: lessonIdeas.bunnyGuid,
            })
            .from(lessonIdeas)
            .where(inArray(lessonIdeas.lessonId, lessonIds))
            .orderBy(asc(lessonIdeas.ideaOrder));

        ideas.forEach(idea => {
            if (!ideasByLesson.has(idea.lessonId)) ideasByLesson.set(idea.lessonId, []);
            ideasByLesson.get(idea.lessonId)!.push(resolveIdea(idea));
        });
    }

    // Group by sessionId
    const resourcesBySession = new Map<string, any[]>();
    sessionLessonsRows.forEach(row => {
        if (!resourcesBySession.has(row.sessionId)) resourcesBySession.set(row.sessionId, []);
        const existingLessons = resourcesBySession.get(row.sessionId)!;
        if (!existingLessons.some((l: any) => l.id === row.lesson.id)) {
            existingLessons.push({
                ...row.lesson,
                chapter: row.chapter,
                course: row.course,
                ideas: ideasByLesson.get(row.lesson.id) || [],
            });
        }
    });

    return resourcesBySession;
}

// ── Controllers ───────────────────────────────────────────────────────────────

export const getAllTeacherSessions = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);

    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, teacherId));
    if (!teacher) throw new NotFound("Teacher not found");

    const rawSessions = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            materialLink: sessions.material_link,
            sessionRelationalType: sessions.sessionRelationalType,
            contentAccessDays: sessions.contentAccessDays,
            createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(eq(sessions.teacherId, teacherId))
        .orderBy(desc(sessions.sessionDate), desc(sessions.timeFrom));

    const sessionIds = rawSessions.map(s => s.id);
    const resourcesBySession = await fetchSessionResources(sessionIds);

    const result = rawSessions.map(s => ({
        ...s,
        lessons: resourcesBySession.get(s.id) || [],
    }));

    return SuccessResponse(res, {
        message: "Sessions fetched successfully",
        count: result.length,
        sessions: result,
    }, 200);
};

export const getUpcomingTeacherSessions = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toISOString().split("T")[1].slice(0, 8);

    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, teacherId));
    if (!teacher) throw new NotFound("Teacher not found");

    const rawSessions = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            materialLink: sessions.material_link,
            sessionRelationalType: sessions.sessionRelationalType,
            contentAccessDays: sessions.contentAccessDays,
        })
        .from(sessions)
        .where(
            and(
                eq(sessions.teacherId, teacherId),
                sql`(
                    ${sessions.sessionDate} > ${today}
                    OR (${sessions.sessionDate} = ${today} AND ${sessions.timeTo} >= ${currentTime})
                )`
            )
        )
        .orderBy(asc(sessions.sessionDate), asc(sessions.timeFrom));

    const sessionIds = rawSessions.map(s => s.id);
    const resourcesBySession = await fetchSessionResources(sessionIds);

    const result = rawSessions.map(s => ({
        ...s,
        lessons: resourcesBySession.get(s.id) || [],
    }));

    return SuccessResponse(res, {
        message: "Upcoming sessions fetched successfully",
        count: result.length,
        sessions: result,
    }, 200);
};

export const getPastTeacherSessions = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toISOString().split("T")[1].slice(0, 8);

    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, teacherId));
    if (!teacher) throw new NotFound("Teacher not found");

    const rawSessions = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            materialLink: sessions.material_link,
            sessionRelationalType: sessions.sessionRelationalType,
            contentAccessDays: sessions.contentAccessDays,
        })
        .from(sessions)
        .where(
            and(
                eq(sessions.teacherId, teacherId),
                sql`(
                    ${sessions.sessionDate} < ${today}
                    OR (${sessions.sessionDate} = ${today} AND ${sessions.timeTo} < ${currentTime})
                )`
            )
        )
        .orderBy(desc(sessions.sessionDate), desc(sessions.timeFrom));

    const sessionIds = rawSessions.map(s => s.id);
    const resourcesBySession = await fetchSessionResources(sessionIds);

    const result = rawSessions.map(s => ({
        ...s,
        lessons: resourcesBySession.get(s.id) || [],
    }));

    return SuccessResponse(res, {
        message: "Past sessions fetched successfully",
        count: result.length,
        sessions: result,
    }, 200);
};

export const getTeacherSessionById = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const { id } = req.params;

    const [session] = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            materialLink: sessions.material_link,
            teacherMaterialLink: sessions.teacher_material_link,
            sessionRelationalType: sessions.sessionRelationalType,
            contentAccessDays: sessions.contentAccessDays,
            createdAt: sessions.createdAt,
        })
        .from(sessions)
        .where(and(eq(sessions.id, id), eq(sessions.teacherId, teacherId)));

    if (!session) throw new NotFound("Session not found");

    // Lessons + resources
    const resourcesBySession = await fetchSessionResources([id]);

    // Linked groups
    const linkedGroups = await db
        .select({ id: groups.id, name: groups.name })
        .from(sessionGroups)
        .innerJoin(groups, eq(sessionGroups.groupId, groups.id))
        .where(eq(sessionGroups.sessionId, id));

    // Total enrolled student count
    const directStudents = await db
        .select({ studentId: sessionUsers.studentId })
        .from(sessionUsers)
        .where(eq(sessionUsers.sessionId, id));

    const groupStudentRows = await db
        .select({ studentId: groupStudents.studentId })
        .from(sessionGroups)
        .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
        .where(eq(sessionGroups.sessionId, id));

    const allStudentIds = new Set([
        ...directStudents.map(s => s.studentId),
        ...groupStudentRows.map(s => s.studentId),
    ]);

    return SuccessResponse(res, {
        message: "Session fetched successfully",
        session: {
            ...session,
            lessons: resourcesBySession.get(id) || [],
            groups: linkedGroups,
            studentsCount: allStudentIds.size,
        },
    }, 200);
};

export const getSessionStudents = async (req: Request, res: Response) => {
    const teacherId = getTeacherId(req);
    const { id: sessionId } = req.params;

    // Verify this session belongs to the teacher
    const [session] = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.teacherId, teacherId)));

    if (!session) throw new NotFound("Session not found");

    // 1. Direct students
    const directRows = await db
        .select({
            studentId: sessionUsers.studentId,
            enrollmentType: sql<string>`'direct'`,
        })
        .from(sessionUsers)
        .where(eq(sessionUsers.sessionId, sessionId));

    // 2. Group students
    const groupRows = await db
        .select({
            studentId: groupStudents.studentId,
            enrollmentType: sql<string>`'group'`,
            groupId: groupStudents.groupId,
        })
        .from(sessionGroups)
        .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
        .where(eq(sessionGroups.sessionId, sessionId));

    // Merge & deduplicate
    const studentMap = new Map<string, { studentId: string; enrollmentType: string; groupId?: string }>();
    directRows.forEach(r => studentMap.set(r.studentId, { studentId: r.studentId, enrollmentType: "direct" }));
    groupRows.forEach(r => {
        if (!studentMap.has(r.studentId)) {
            studentMap.set(r.studentId, { studentId: r.studentId, enrollmentType: "group", groupId: r.groupId });
        }
    });

    const allStudentIds = Array.from(studentMap.keys());

    if (allStudentIds.length === 0) {
        return SuccessResponse(res, {
            message: "No students enrolled in this session",
            count: 0,
            students: [],
        }, 200);
    }

    // 3. Fetch student info
    const studentRows = await db
        .select({
            id: Student.id,
            firstname: Student.firstname,
            lastname: Student.lastname,
            phone: Student.phone,
            avatar: Student.avatar,
        })
        .from(Student)
        .where(inArray(Student.id, allStudentIds));

    // 4. Fetch attendance
    const attendanceRows = await db
        .select({
            studentId: sessionAttendance.studentId,
            status: sessionAttendance.status,
            attendedAt: sessionAttendance.attendedAt,
        })
        .from(sessionAttendance)
        .where(eq(sessionAttendance.sessionId, sessionId));

    const attendanceMap = new Map(attendanceRows.map(a => [a.studentId, a]));

    const formattedStudents = studentRows.map(student => {
        const attendance = attendanceMap.get(student.id);
        const enrollment = studentMap.get(student.id);
        return {
            id: student.id,
            name: `${student.firstname} ${student.lastname}`,
            phone: student.phone,
            avatar: student.avatar,
            enrollmentType: enrollment?.enrollmentType ?? "direct",
            groupId: enrollment?.groupId ?? null,
            attendance: attendance
                ? {
                    status: attendance.status,
                    attendedAt: attendance.attendedAt,
                }
                : { status: "not_marked", attendedAt: null },
        };
    });

    return SuccessResponse(res, {
        message: "Session students fetched successfully",
        count: formattedStudents.length,
        students: formattedStudents,
    }, 200);
};
