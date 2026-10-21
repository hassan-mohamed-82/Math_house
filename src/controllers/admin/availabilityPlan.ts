import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import {
    studentAvailabilityPlans,
    studentAvailabilitySlots,
    studentPlanSessions
} from "../../models/schema/admin/StudentAvailabilityPlan";
import { Student } from "../../models/schema/admin/Student";
import { sessions, sessionUsers, sessionLessons } from "../../models/schema/admin/Session";
import { teachers } from "../../models/schema/admin/teacher";
import { admins } from "../../models/schema/admin/admin";
import { grade } from "../../models/schema/admin/grade";
import { lessons } from "../../models/schema/admin/lessons";
import { category } from "../../models/schema/admin/category";
import { eq, and, or, desc, sql, inArray, like, gte } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound } from "../../Errors";
import { sendStudentNotification } from "../../utils/studentNotification";

// ── 1. Get All Availability Plans (Admin) ───────────────────────────────────
export const getAllAvailabilityPlans = async (req: Request, res: Response) => {
    const {
        status,
        studentId,
        search,
        page = "1",
        limit = "10"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];

    if (status && typeof status === "string") {
        conditions.push(eq(studentAvailabilityPlans.status, status as any));
    }

    if (studentId && typeof studentId === "string") {
        conditions.push(eq(studentAvailabilityPlans.studentId, studentId));
    }

    if (search && typeof search === "string") {
        const searchTerm = `%${search}%`;
        conditions.push(
            or(
                like(studentAvailabilityPlans.title, searchTerm),
                like(Student.firstname, searchTerm),
                like(Student.lastname, searchTerm),
                like(Student.email, searchTerm),
                like(Student.phone, searchTerm)
            )
        );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${studentAvailabilityPlans.id})` })
        .from(studentAvailabilityPlans)
        .innerJoin(Student, eq(studentAvailabilityPlans.studentId, Student.id))
        .where(whereClause);

    const total = Number(countResult?.count || 0);

    const plans = await db
        .select({
            id: studentAvailabilityPlans.id,
            title: studentAvailabilityPlans.title,
            status: studentAvailabilityPlans.status,
            notes: studentAvailabilityPlans.notes,
            adminNotes: studentAvailabilityPlans.adminNotes,
            studentFeedback: studentAvailabilityPlans.studentFeedback,
            proposedAt: studentAvailabilityPlans.proposedAt,
            respondedAt: studentAvailabilityPlans.respondedAt,
            createdAt: studentAvailabilityPlans.createdAt,
            updatedAt: studentAvailabilityPlans.updatedAt,
            student: {
                id: Student.id,
                firstname: Student.firstname,
                lastname: Student.lastname,
                email: Student.email,
                phone: Student.phone,
                gradeId: Student.grade,
                categoryId: Student.category,
            },
        })
        .from(studentAvailabilityPlans)
        .innerJoin(Student, eq(studentAvailabilityPlans.studentId, Student.id))
        .where(whereClause)
        .orderBy(desc(studentAvailabilityPlans.createdAt))
        .limit(limitNum)
        .offset(offset);

    const planIds: string[] = plans.map((p) => p.id as string);
    let slotsMap: Record<string, any[]> = {};
    let sessionCountMap: Record<string, number> = {};

    if (planIds.length > 0) {
        const allSlots = await db
            .select()
            .from(studentAvailabilitySlots)
            .where(inArray(studentAvailabilitySlots.planId, planIds));

        for (const slot of allSlots) {
            if (!slotsMap[slot.planId]) slotsMap[slot.planId] = [];
            slotsMap[slot.planId].push(slot);
        }

        const sessionCounts = await db
            .select({
                planId: studentPlanSessions.planId,
                count: sql<number>`COUNT(*)`,
            })
            .from(studentPlanSessions)
            .where(inArray(studentPlanSessions.planId, planIds))
            .groupBy(studentPlanSessions.planId);

        for (const sc of sessionCounts) {
            sessionCountMap[sc.planId] = Number(sc.count);
        }
    }

    const items = plans.map((p) => ({
        ...p,
        slots: slotsMap[p.id as string] || [],
        proposedSessionsCount: sessionCountMap[p.id as string] || 0,
    }));

    return SuccessResponse(res, {
        items,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    });
};

// ── 2. Get Single Availability Plan by ID (Admin) ───────────────────────────
export const getAvailabilityPlanById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [plan] = await db
        .select({
            id: studentAvailabilityPlans.id,
            title: studentAvailabilityPlans.title,
            notes: studentAvailabilityPlans.notes,
            status: studentAvailabilityPlans.status,
            adminNotes: studentAvailabilityPlans.adminNotes,
            studentFeedback: studentAvailabilityPlans.studentFeedback,
            proposedAt: studentAvailabilityPlans.proposedAt,
            respondedAt: studentAvailabilityPlans.respondedAt,
            createdAt: studentAvailabilityPlans.createdAt,
            updatedAt: studentAvailabilityPlans.updatedAt,
            student: {
                id: Student.id,
                firstname: Student.firstname,
                lastname: Student.lastname,
                email: Student.email,
                phone: Student.phone,
                avatar: Student.avatar,
                livebalance: Student.livebalance,
                gradeId: Student.grade,
                categoryId: Student.category,
            },
            proposedByAdmin: {
                id: admins.id,
                name: admins.name,
            },
        })
        .from(studentAvailabilityPlans)
        .innerJoin(Student, eq(studentAvailabilityPlans.studentId, Student.id))
        .leftJoin(admins, eq(studentAvailabilityPlans.proposedBy, admins.id))
        .where(eq(studentAvailabilityPlans.id, id))
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    // Get grade and category details for the student
    const [studentGrade] = plan.student.gradeId
        ? await db.select().from(grade).where(eq(grade.id, plan.student.gradeId)).limit(1)
        : [null];

    const [studentCategory] = plan.student.categoryId
        ? await db.select().from(category).where(eq(category.id, plan.student.categoryId)).limit(1)
        : [null];

    const slots = await db
        .select()
        .from(studentAvailabilitySlots)
        .where(eq(studentAvailabilitySlots.planId, id));

    const proposedSessions = await db
        .select({
            planSessionId: studentPlanSessions.id,
            planSessionNotes: studentPlanSessions.notes,
            orderIndex: studentPlanSessions.orderIndex,
            studentResponse: studentPlanSessions.studentResponse,
            sessionId: sessions.id,
            sessionName: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionRelationalType: sessions.sessionRelationalType,
            sessionLink: sessions.session_link,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
        })
        .from(studentPlanSessions)
        .innerJoin(sessions, eq(studentPlanSessions.sessionId, sessions.id))
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(eq(studentPlanSessions.planId, id))
        .orderBy(studentPlanSessions.orderIndex, sessions.sessionDate, sessions.timeFrom);

    return SuccessResponse(res, {
        plan: {
            ...plan,
            student: {
                ...plan.student,
                grade: studentGrade,
                category: studentCategory,
            },
            slots,
            proposedSessions,
        },
    });
};

// ── 3. Suggest Sessions Matching Student Availability (Admin Helper) ────────
export const getMatchingSessionsForPlan = async (req: Request, res: Response) => {
    const { id } = req.params;

    // ── Load plan ──────────────────────────────────────────────────────────────
    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.id, id))
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    const studentId = plan.studentId;

    // ── Load student availability slots for this plan ─────────────────────────
    const slots = await db
        .select()
        .from(studentAvailabilitySlots)
        .where(eq(studentAvailabilitySlots.planId, id));

    const todayStr = new Date().toISOString().split("T")[0];

    // ── Fetch upcoming sessions ───────────────────────────────────────────────
    const upcomingSessions = await db
        .select({
            id: sessions.id,
            name: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionRelationalType: sessions.sessionRelationalType,
            teacherId: sessions.teacherId,
            teacherName: teachers.name,
        })
        .from(sessions)
        .leftJoin(teachers, eq(sessions.teacherId, teachers.id))
        .where(
            or(
                gte(sessions.sessionDate, new Date(todayStr)),
                gte(sessions.endDate, new Date(todayStr))
            )
        )
        .orderBy(sessions.sessionDate, sessions.timeFrom)
        .limit(200);

    if (upcomingSessions.length === 0) {
        return SuccessResponse(res, { planSlots: slots, candidateSessions: [] });
    }

    const allSessionIds = upcomingSessions.map((s) => s.id);

    // ── Fetch lessons linked to each session ──────────────────────────────────
    const allSessionLessons = await db
        .select({
            sessionId: sessionLessons.sessionId,
            lessonId: lessons.id,
            lessonName: lessons.name,
            lessonOrder: lessons.order,
        })
        .from(sessionLessons)
        .innerJoin(lessons, eq(sessionLessons.lessonId, lessons.id))
        .where(inArray(sessionLessons.sessionId, allSessionIds));

    // Build a lookup: sessionId → lesson[]  
    const lessonsMap: Record<string, { lessonId: string; lessonName: string; lessonOrder: number }[]> = {};
    for (const sl of allSessionLessons) {
        if (!lessonsMap[sl.sessionId]) lessonsMap[sl.sessionId] = [];
        lessonsMap[sl.sessionId].push({
            lessonId: sl.lessonId,
            lessonName: sl.lessonName,
            lessonOrder: sl.lessonOrder ?? 0,
        });
    }

    // ── Check which sessions the student is already enrolled in ───────────────
    const enrolledRows = await db
        .select({ sessionId: sessionUsers.sessionId })
        .from(sessionUsers)
        .where(
            and(
                eq(sessionUsers.studentId, studentId),
                inArray(sessionUsers.sessionId, allSessionIds)
            )
        );

    const enrolledSessionIds = new Set(enrolledRows.map((r) => r.sessionId));

    // ── Helper ────────────────────────────────────────────────────────────────
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const toMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
    };

    // ── Match each session against student availability slots ─────────────────
    const matchedSessions: any[] = [];

    for (const session of upcomingSessions) {
        const matchingSlots: {
            slotId: string;
            dayOfWeek: string | null;
            specificDate: string | null;
            timeFrom: string;
            timeTo: string;
        }[] = [];

        for (const slot of slots) {
            let matchesDayOrDate = false;

            if (slot.specificDate && session.sessionDate) {
                const sDate = new Date(session.sessionDate).toISOString().split("T")[0];
                const targetDate =
                    typeof slot.specificDate === "string"
                        ? slot.specificDate
                        : new Date(slot.specificDate).toISOString().split("T")[0];
                if (sDate === targetDate) matchesDayOrDate = true;
            } else if (slot.dayOfWeek && session.sessionDate) {
                const sDay = dayNames[new Date(session.sessionDate).getUTCDay()];
                if (sDay.toLowerCase() === slot.dayOfWeek.toLowerCase()) matchesDayOrDate = true;
            }

            if (matchesDayOrDate) {
                const sessionStart = toMinutes(session.timeFrom);
                const sessionEnd   = toMinutes(session.timeTo);
                const slotStart    = toMinutes(slot.timeFrom);
                const slotEnd      = toMinutes(slot.timeTo);

                // Overlap: session starts before slot ends AND session ends after slot starts
                const overlapsTime = sessionStart < slotEnd && sessionEnd > slotStart;
                if (overlapsTime) {
                    matchingSlots.push({
                        slotId:       slot.id,
                        dayOfWeek:    slot.dayOfWeek ?? null,
                        specificDate: slot.specificDate
                            ? (typeof slot.specificDate === "string"
                                ? slot.specificDate
                                : new Date(slot.specificDate).toISOString().split("T")[0])
                            : null,
                        timeFrom: slot.timeFrom,
                        timeTo:   slot.timeTo,
                    });
                }
            }
        }

        // ── Only include sessions that match at least one slot ────────────────
        if (matchingSlots.length === 0) continue;

        matchedSessions.push({
            ...session,
            // ── Availability ─────────────────────────────────────────────────
            matchingSlots,
            // ── Academic content linked to this session ───────────────────────
            lessons: lessonsMap[session.id] ?? [],
            // ── Whether this student is already enrolled ──────────────────────
            studentAlreadyEnrolled: enrolledSessionIds.has(session.id),
        });
    }

    // Sort chronologically (already ordered by DB, but keep consistent)
    matchedSessions.sort((a, b) => {
        const da = a.sessionDate ? new Date(a.sessionDate).getTime() : 0;
        const db_ = b.sessionDate ? new Date(b.sessionDate).getTime() : 0;
        if (da !== db_) return da - db_;
        return toMinutes(a.timeFrom) - toMinutes(b.timeFrom);
    });

    return SuccessResponse(res, {
        planSlots: slots,
        candidateSessions: matchedSessions,
    });
};

// ── 4. Propose Sessions for Plan (Admin) ────────────────────────────────────
export const proposeSessionsForPlan = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { sessionIds, adminNotes, sessionNotes } = req.body;
    const adminId = req.user?.id;

    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.id, id))
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    if (plan.status === "cancelled") {
        throw new BadRequest("Cannot propose sessions for a cancelled plan");
    }

    // Verify all session IDs exist
    const uniqueSessionIds = Array.from(new Set(sessionIds as string[]));
    const foundSessions = await db
        .select({ id: sessions.id, name: sessions.name })
        .from(sessions)
        .where(inArray(sessions.id, uniqueSessionIds));

    if (foundSessions.length !== uniqueSessionIds.length) {
        throw new BadRequest("One or more selected sessions were not found");
    }

    // Build session notes lookup if provided
    const notesMap: Record<string, string> = {};
    if (sessionNotes && Array.isArray(sessionNotes)) {
        for (const sn of sessionNotes) {
            if (sn.sessionId && sn.notes) {
                notesMap[sn.sessionId] = sn.notes;
            }
        }
    }

    // Replace current proposed sessions
    await db.delete(studentPlanSessions).where(eq(studentPlanSessions.planId, id));

    const planSessionInserts = uniqueSessionIds.map((sessionId, idx) => ({
        id: randomUUID(),
        planId: id,
        sessionId,
        notes: notesMap[sessionId] || null,
        orderIndex: idx + 1,
    }));

    await db.insert(studentPlanSessions).values(planSessionInserts);

    // Update plan status and proposal info
    await db
        .update(studentAvailabilityPlans)
        .set({
            status: "plan_proposed",
            adminNotes: adminNotes !== undefined ? adminNotes : plan.adminNotes,
            proposedBy: adminId || null,
            proposedAt: new Date(),
        })
        .where(eq(studentAvailabilityPlans.id, id));

    // Send notification to the student
    await sendStudentNotification(
        plan.studentId,
        `Admin has prepared a study plan for "${plan.title}" with ${uniqueSessionIds.length} proposed sessions. Please review and accept or reject the plan.`
    );

    return SuccessResponse(res, {
        message: `Proposed ${uniqueSessionIds.length} sessions for the student plan successfully. Student has been notified.`,
        planId: id,
        status: "plan_proposed",
        proposedSessionsCount: uniqueSessionIds.length,
    });
};

// ── 5. Update Plan Status (Admin) ──────────────────────────────────────────
export const updatePlanStatus = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.id, id))
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    const updateData: any = { status };
    if (adminNotes !== undefined) {
        updateData.adminNotes = adminNotes;
    }

    await db
        .update(studentAvailabilityPlans)
        .set(updateData)
        .where(eq(studentAvailabilityPlans.id, id));

    return SuccessResponse(res, {
        message: `Plan status updated to '${status}'.`,
        planId: id,
        status,
    });
};

// ── 6. Delete Availability Plan (Admin) ─────────────────────────────────────
export const deleteAvailabilityPlan = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.id, id))
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    // Cascade handles slots and plan sessions
    await db.delete(studentAvailabilityPlans).where(eq(studentAvailabilityPlans.id, id));

    return SuccessResponse(res, { message: "Availability plan deleted successfully." });
};
