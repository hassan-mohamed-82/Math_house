import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../../models/connection";
import {
    studentAvailabilityPlans,
    studentAvailabilitySlots,
    studentPlanSessions,
    adminAvailabilitySlots,
    DAYS_OF_WEEK,
} from "../../models/schema/admin/StudentAvailabilityPlan";
import { Student } from "../../models/schema/admin/Student";
import { sessions, sessionUsers } from "../../models/schema/admin/Session";
import { teachers } from "../../models/schema/admin/teacher";
import { eq, and, desc, asc, sql, inArray } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest, NotFound, UnauthorizedError } from "../../Errors";
import { sendStudentNotification } from "../../utils/studentNotification";

const getStudentId = (req: Request): string => {
    if (!req.user?.id) throw new UnauthorizedError("Not authenticated");
    return req.user.id;
};

// ── Helper: Resolve slots from admin templates or custom slot inputs ──────────
const resolveAndPrepareSlots = async (planId: string, slotIds?: string[], slots?: any[]) => {
    const slotInserts: any[] = [];

    // Option 1: Direct array of admin slot IDs selected by student
    if (Array.isArray(slotIds) && slotIds.length > 0) {
        const foundAdminSlots = await db
            .select()
            .from(adminAvailabilitySlots)
            .where(
                and(
                    inArray(adminAvailabilitySlots.id, slotIds),
                    eq(adminAvailabilitySlots.isActive, true)
                )
            );

        if (foundAdminSlots.length !== slotIds.length) {
            throw new BadRequest("One or more selected slots are invalid or no longer active.");
        }

        for (const adminSlot of foundAdminSlots) {
            slotInserts.push({
                id: randomUUID(),
                planId,
                adminSlotId: adminSlot.id,
                dayOfWeek: adminSlot.dayOfWeek,
                specificDate: null,
                timeFrom: adminSlot.timeFrom,
                timeTo: adminSlot.timeTo,
            });
        }
    } else if (Array.isArray(slots) && slots.length > 0) {
        // Option 2: Array of slot objects (each may specify slotId and/or specificDate / custom times)
        const refIds = slots.filter((s: any) => s.slotId).map((s: any) => s.slotId);
        let adminSlotsMap: Record<string, any> = {};

        if (refIds.length > 0) {
            const foundAdminSlots = await db
                .select()
                .from(adminAvailabilitySlots)
                .where(
                    and(
                        inArray(adminAvailabilitySlots.id, refIds),
                        eq(adminAvailabilitySlots.isActive, true)
                    )
                );

            if (foundAdminSlots.length !== refIds.length) {
                throw new BadRequest("One or more selected slots are invalid or no longer active.");
            }

            for (const as of foundAdminSlots) {
                adminSlotsMap[as.id] = as;
            }
        }

        for (const s of slots) {
            if (s.slotId && adminSlotsMap[s.slotId]) {
                const adminSlot = adminSlotsMap[s.slotId];
                slotInserts.push({
                    id: randomUUID(),
                    planId,
                    adminSlotId: adminSlot.id,
                    dayOfWeek: adminSlot.dayOfWeek,
                    specificDate: s.specificDate ? s.specificDate : null,
                    timeFrom: adminSlot.timeFrom,
                    timeTo: adminSlot.timeTo,
                });
            } else {
                slotInserts.push({
                    id: randomUUID(),
                    planId,
                    adminSlotId: null,
                    dayOfWeek: s.dayOfWeek || null,
                    specificDate: s.specificDate ? s.specificDate : null,
                    timeFrom: s.timeFrom,
                    timeTo: s.timeTo,
                });
            }
        }
    }

    return slotInserts;
};

// ── 0. Get Available Slots for Students ──────────────────────────────────────
// Returns all 7 days of the week and all active slots defined by the admin
export const getAvailableSlots = async (req: Request, res: Response) => {
    const { dayOfWeek } = req.query;

    const conditions: any[] = [eq(adminAvailabilitySlots.isActive, true)];

    if (dayOfWeek && typeof dayOfWeek === "string") {
        conditions.push(eq(adminAvailabilitySlots.dayOfWeek, dayOfWeek as any));
    }

    const allSlots = await db
        .select()
        .from(adminAvailabilitySlots)
        .where(and(...conditions))
        .orderBy(asc(adminAvailabilitySlots.dayOfWeek), asc(adminAvailabilitySlots.timeFrom));

    const grouped: Record<string, any[]> = {
        Saturday: [],
        Sunday: [],
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
    };

    for (const slot of allSlots) {
        if (grouped[slot.dayOfWeek]) {
            grouped[slot.dayOfWeek].push(slot);
        }
    }

    // Sort slots within each day by timeFrom ascending
    for (const day of DAYS_OF_WEEK) {
        grouped[day].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
    }

    const days = DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day,
        count: grouped[day].length,
        slots: grouped[day],
    }));

    return SuccessResponse(res, {
        message: "Available slots retrieved successfully",
        total: allSlots.length,
        days,
        grouped,
        slots: allSlots,
    });
};

// ── 1. Create Availability Plan ──────────────────────────────────────────────
export const createAvailabilityPlan = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { title, notes, slots, slotIds } = req.body;

    const [existingStudent] = await db
        .select({ id: Student.id })
        .from(Student)
        .where(eq(Student.id, studentId))
        .limit(1);

    if (!existingStudent) {
        throw new NotFound("Student not found");
    }

    const planId = randomUUID();

    await db.insert(studentAvailabilityPlans).values({
        id: planId,
        studentId,
        title,
        notes: notes || null,
        status: "pending_admin_review",
    });

    const slotInserts = await resolveAndPrepareSlots(planId, slotIds, slots);

    if (slotInserts.length === 0) {
        throw new BadRequest("Please select at least one availability slot.");
    }

    await db.insert(studentAvailabilitySlots).values(slotInserts);

    const [createdPlan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.id, planId));

    const createdSlots = await db
        .select()
        .from(studentAvailabilitySlots)
        .where(eq(studentAvailabilitySlots.planId, planId));

    return SuccessResponse(res, {
        message: "Availability plan submitted successfully. Admin will review and propose sessions.",
        plan: {
            ...createdPlan,
            slots: createdSlots,
        },
    }, 201);
};

// ── 2. Get My Availability Plans ─────────────────────────────────────────────
export const getMyAvailabilityPlans = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { status, page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(studentAvailabilityPlans.studentId, studentId)];
    if (status && typeof status === "string") {
        conditions.push(eq(studentAvailabilityPlans.status, status as any));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(studentAvailabilityPlans)
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
        })
        .from(studentAvailabilityPlans)
        .where(whereClause)
        .orderBy(desc(studentAvailabilityPlans.createdAt))
        .limit(limitNum)
        .offset(offset);

    // Fetch slots and session counts for these plans
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

// ── 3. Get Single Availability Plan by ID ───────────────────────────────────
export const getMyAvailabilityPlanById = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { id } = req.params;

    const [plan] = await db
        .select({
            id: studentAvailabilityPlans.id,
            studentId: studentAvailabilityPlans.studentId,
            title: studentAvailabilityPlans.title,
            notes: studentAvailabilityPlans.notes,
            status: studentAvailabilityPlans.status,
            adminNotes: studentAvailabilityPlans.adminNotes,
            studentFeedback: studentAvailabilityPlans.studentFeedback,
            proposedAt: studentAvailabilityPlans.proposedAt,
            respondedAt: studentAvailabilityPlans.respondedAt,
            createdAt: studentAvailabilityPlans.createdAt,
            updatedAt: studentAvailabilityPlans.updatedAt,
        })
        .from(studentAvailabilityPlans)
        .where(
            and(
                eq(studentAvailabilityPlans.id, id),
                eq(studentAvailabilityPlans.studentId, studentId)
            )
        )
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    const slots = await db
        .select()
        .from(studentAvailabilitySlots)
        .where(eq(studentAvailabilitySlots.planId, id));

    // Fetch proposed sessions with details
    const proposedSessions = await db
        .select({
            planSessionId: studentPlanSessions.id,
            planSessionNotes: studentPlanSessions.notes,
            orderIndex: studentPlanSessions.orderIndex,
            sessionId: sessions.id,
            sessionName: sessions.name,
            scheduleType: sessions.scheduleType,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            timeFrom: sessions.timeFrom,
            timeTo: sessions.timeTo,
            sessionLink: sessions.session_link,
            sessionRelationalType: sessions.sessionRelationalType,
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
            slots,
            proposedSessions,
        },
    });
};

// ── 4. Respond to Proposed Plan (Accept / Reject) ───────────────────────────
export const respondToProposedPlan = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { id } = req.params;
    const { action, feedback } = req.body;

    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(
            and(
                eq(studentAvailabilityPlans.id, id),
                eq(studentAvailabilityPlans.studentId, studentId)
            )
        )
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    if (plan.status === "pending_admin_review") {
        throw new BadRequest("The admin has not yet proposed sessions for this plan.");
    }

    if (plan.status === "accepted") {
        throw new BadRequest("This plan has already been accepted.");
    }

    if (plan.status === "cancelled") {
        throw new BadRequest("This plan was cancelled and cannot be responded to.");
    }

    if (action === "accept") {
        // Fetch all assigned sessions
        const assignedSessions = await db
            .select({ sessionId: studentPlanSessions.sessionId })
            .from(studentPlanSessions)
            .where(eq(studentPlanSessions.planId, id));

        if (assignedSessions.length === 0) {
            throw new BadRequest("Cannot accept a plan with no proposed sessions.");
        }

        const sessionIds = assignedSessions.map((s) => s.sessionId);

        // Find which sessions the student is not yet enrolled in
        const existingEnrollments = await db
            .select({ sessionId: sessionUsers.sessionId })
            .from(sessionUsers)
            .where(
                and(
                    eq(sessionUsers.studentId, studentId),
                    inArray(sessionUsers.sessionId, sessionIds)
                )
            );

        const enrolledSet = new Set(existingEnrollments.map((e) => e.sessionId));
        const newEnrollments = sessionIds
            .filter((sId) => !enrolledSet.has(sId))
            .map((sId) => ({
                id: randomUUID(),
                sessionId: sId,
                studentId,
            }));

        if (newEnrollments.length > 0) {
            await db.insert(sessionUsers).values(newEnrollments);
        }

        // Update plan status
        await db
            .update(studentAvailabilityPlans)
            .set({
                status: "accepted",
                studentFeedback: feedback || null,
                respondedAt: new Date(),
            })
            .where(eq(studentAvailabilityPlans.id, id));

        await sendStudentNotification(
            studentId,
            `You have successfully accepted the study plan "${plan.title}". You are now enrolled in ${sessionIds.length} sessions!`
        );

        return SuccessResponse(res, {
            message: `Plan accepted successfully! You are now enrolled in ${sessionIds.length} sessions.`,
            enrolledCount: sessionIds.length,
            newlyEnrolledCount: newEnrollments.length,
            status: "accepted",
        });
    }

    if (action === "reject") {
        await db
            .update(studentAvailabilityPlans)
            .set({
                status: "rejected",
                studentFeedback: feedback || null,
                respondedAt: new Date(),
            })
            .where(eq(studentAvailabilityPlans.id, id));

        await sendStudentNotification(
            studentId,
            `You have rejected the proposed schedule for "${plan.title}". The admin will review your feedback and propose alternative sessions.`
        );

        return SuccessResponse(res, {
            message: "Plan rejected. Your feedback has been recorded for admin review.",
            status: "rejected",
        });
    }

    throw new BadRequest("Invalid action. Must be 'accept' or 'reject'.");
};

// ── 5. Cancel Plan (Only if pending admin review) ───────────────────────────
export const cancelAvailabilityPlan = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { id } = req.params;

    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(
            and(
                eq(studentAvailabilityPlans.id, id),
                eq(studentAvailabilityPlans.studentId, studentId)
            )
        )
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    if (plan.status !== "pending_admin_review") {
        throw new BadRequest("Cannot cancel a plan that has already been processed or answered.");
    }

    await db
        .update(studentAvailabilityPlans)
        .set({ status: "cancelled" })
        .where(eq(studentAvailabilityPlans.id, id));

    return SuccessResponse(res, { message: "Availability plan cancelled successfully." });
};

// ── 6. Update Availability Plan ─────────────────────────────────────────────
export const updateAvailabilityPlan = async (req: Request, res: Response) => {
    const studentId = getStudentId(req);
    const { id } = req.params;
    const { title, notes, slots, slotIds } = req.body;

    const [plan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(
            and(
                eq(studentAvailabilityPlans.id, id),
                eq(studentAvailabilityPlans.studentId, studentId)
            )
        )
        .limit(1);

    if (!plan) {
        throw new NotFound("Availability plan not found");
    }

    if (plan.status === "accepted") {
        throw new BadRequest("Cannot update an already accepted plan.");
    }

    if (plan.status === "cancelled") {
        throw new BadRequest("Cannot update a cancelled plan.");
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (notes !== undefined) updateData.notes = notes;

    const hasNewSlots = (slotIds && Array.isArray(slotIds) && slotIds.length > 0) ||
        (slots && Array.isArray(slots) && slots.length > 0);

    // If slots are updated, reset status back to pending_admin_review if it was rejected or proposed
    if (hasNewSlots) {
        if (plan.status === "rejected" || plan.status === "plan_proposed") {
            updateData.status = "pending_admin_review";
        }
    }

    if (Object.keys(updateData).length > 0) {
        await db
            .update(studentAvailabilityPlans)
            .set(updateData)
            .where(eq(studentAvailabilityPlans.id, id));
    }

    if (hasNewSlots) {
        const slotInserts = await resolveAndPrepareSlots(id, slotIds, slots);

        if (slotInserts.length > 0) {
            await db.delete(studentAvailabilitySlots).where(eq(studentAvailabilitySlots.planId, id));
            await db.insert(studentAvailabilitySlots).values(slotInserts);
        }
    }

    const [updatedPlan] = await db
        .select()
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.id, id));

    const updatedSlots = await db
        .select()
        .from(studentAvailabilitySlots)
        .where(eq(studentAvailabilitySlots.planId, id));

    return SuccessResponse(res, {
        message: "Availability plan updated successfully.",
        plan: {
            ...updatedPlan,
            slots: updatedSlots,
        },
    });
};
