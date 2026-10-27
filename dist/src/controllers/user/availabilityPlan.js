"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAvailabilityPlan = exports.cancelAvailabilityPlan = exports.respondToProposedPlan = exports.getMyAvailabilityPlanById = exports.getMyAvailabilityPlans = exports.createAvailabilityPlan = exports.getAvailableSlots = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const StudentAvailabilityPlan_1 = require("../../models/schema/admin/StudentAvailabilityPlan");
const Student_1 = require("../../models/schema/admin/Student");
const Session_1 = require("../../models/schema/admin/Session");
const teacher_1 = require("../../models/schema/admin/teacher");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const studentNotification_1 = require("../../utils/studentNotification");
const getStudentId = (req) => {
    if (!req.user?.id)
        throw new Errors_1.UnauthorizedError("Not authenticated");
    return req.user.id;
};
// ── Helper: Resolve slots from admin templates or custom slot inputs ──────────
const resolveAndPrepareSlots = async (planId, slotIds, slots) => {
    const slotInserts = [];
    // Option 1: Direct array of admin slot IDs selected by student
    if (Array.isArray(slotIds) && slotIds.length > 0) {
        const foundAdminSlots = await connection_1.db
            .select()
            .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, slotIds), (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.isActive, true)));
        if (foundAdminSlots.length !== slotIds.length) {
            throw new Errors_1.BadRequest("One or more selected slots are invalid or no longer active.");
        }
        for (const adminSlot of foundAdminSlots) {
            slotInserts.push({
                id: (0, crypto_1.randomUUID)(),
                planId,
                adminSlotId: adminSlot.id,
                dayOfWeek: adminSlot.dayOfWeek,
                specificDate: null,
                timeFrom: adminSlot.timeFrom,
                timeTo: adminSlot.timeTo,
            });
        }
    }
    else if (Array.isArray(slots) && slots.length > 0) {
        // Option 2: Array of slot objects (each may specify slotId and/or specificDate / custom times)
        const refIds = slots.filter((s) => s.slotId).map((s) => s.slotId);
        let adminSlotsMap = {};
        if (refIds.length > 0) {
            const foundAdminSlots = await connection_1.db
                .select()
                .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(StudentAvailabilityPlan_1.adminAvailabilitySlots.id, refIds), (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.isActive, true)));
            if (foundAdminSlots.length !== refIds.length) {
                throw new Errors_1.BadRequest("One or more selected slots are invalid or no longer active.");
            }
            for (const as of foundAdminSlots) {
                adminSlotsMap[as.id] = as;
            }
        }
        for (const s of slots) {
            if (s.slotId && adminSlotsMap[s.slotId]) {
                const adminSlot = adminSlotsMap[s.slotId];
                slotInserts.push({
                    id: (0, crypto_1.randomUUID)(),
                    planId,
                    adminSlotId: adminSlot.id,
                    dayOfWeek: adminSlot.dayOfWeek,
                    specificDate: s.specificDate ? s.specificDate : null,
                    timeFrom: adminSlot.timeFrom,
                    timeTo: adminSlot.timeTo,
                });
            }
            else {
                slotInserts.push({
                    id: (0, crypto_1.randomUUID)(),
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
const getAvailableSlots = async (req, res) => {
    const { dayOfWeek } = req.query;
    const conditions = [(0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.isActive, true)];
    if (dayOfWeek && typeof dayOfWeek === "string") {
        conditions.push((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.adminAvailabilitySlots.dayOfWeek, dayOfWeek));
    }
    const allSlots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.adminAvailabilitySlots)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.asc)(StudentAvailabilityPlan_1.adminAvailabilitySlots.dayOfWeek), (0, drizzle_orm_1.asc)(StudentAvailabilityPlan_1.adminAvailabilitySlots.timeFrom));
    const grouped = {
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
    for (const day of StudentAvailabilityPlan_1.DAYS_OF_WEEK) {
        grouped[day].sort((a, b) => a.timeFrom.localeCompare(b.timeFrom));
    }
    const days = StudentAvailabilityPlan_1.DAYS_OF_WEEK.map((day) => ({
        dayOfWeek: day,
        count: grouped[day].length,
        slots: grouped[day],
    }));
    return (0, response_1.SuccessResponse)(res, {
        message: "Available slots retrieved successfully",
        total: allSlots.length,
        days,
        grouped,
        slots: allSlots,
    });
};
exports.getAvailableSlots = getAvailableSlots;
// ── 1. Create Availability Plan ──────────────────────────────────────────────
const createAvailabilityPlan = async (req, res) => {
    const studentId = getStudentId(req);
    const { title, notes, slots, slotIds } = req.body;
    const [existingStudent] = await connection_1.db
        .select({ id: Student_1.Student.id })
        .from(Student_1.Student)
        .where((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId))
        .limit(1);
    if (!existingStudent) {
        throw new Errors_1.NotFound("Student not found");
    }
    const planId = (0, crypto_1.randomUUID)();
    await connection_1.db.insert(StudentAvailabilityPlan_1.studentAvailabilityPlans).values({
        id: planId,
        studentId,
        title,
        notes: notes || null,
        status: "pending_admin_review",
    });
    const slotInserts = await resolveAndPrepareSlots(planId, slotIds, slots);
    if (slotInserts.length === 0) {
        throw new Errors_1.BadRequest("Please select at least one availability slot.");
    }
    await connection_1.db.insert(StudentAvailabilityPlan_1.studentAvailabilitySlots).values(slotInserts);
    const [createdPlan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, planId));
    const createdSlots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, planId));
    return (0, response_1.SuccessResponse)(res, {
        message: "Availability plan submitted successfully. Admin will review and propose sessions.",
        plan: {
            ...createdPlan,
            slots: createdSlots,
        },
    }, 201);
};
exports.createAvailabilityPlan = createAvailabilityPlan;
// ── 2. Get My Availability Plans ─────────────────────────────────────────────
const getMyAvailabilityPlans = async (req, res) => {
    const studentId = getStudentId(req);
    const { status, page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    const conditions = [(0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, studentId)];
    if (status && typeof status === "string") {
        conditions.push((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.status, status));
    }
    const whereClause = (0, drizzle_orm_1.and)(...conditions);
    const [countResult] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.sql) `COUNT(*)` })
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where(whereClause);
    const total = Number(countResult?.count || 0);
    const plans = await connection_1.db
        .select({
        id: StudentAvailabilityPlan_1.studentAvailabilityPlans.id,
        title: StudentAvailabilityPlan_1.studentAvailabilityPlans.title,
        status: StudentAvailabilityPlan_1.studentAvailabilityPlans.status,
        notes: StudentAvailabilityPlan_1.studentAvailabilityPlans.notes,
        adminNotes: StudentAvailabilityPlan_1.studentAvailabilityPlans.adminNotes,
        studentFeedback: StudentAvailabilityPlan_1.studentAvailabilityPlans.studentFeedback,
        proposedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.proposedAt,
        respondedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.respondedAt,
        createdAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.createdAt,
        updatedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.updatedAt,
    })
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where(whereClause)
        .orderBy((0, drizzle_orm_1.desc)(StudentAvailabilityPlan_1.studentAvailabilityPlans.createdAt))
        .limit(limitNum)
        .offset(offset);
    // Fetch slots and session counts for these plans
    const planIds = plans.map((p) => p.id);
    let slotsMap = {};
    let sessionCountMap = {};
    if (planIds.length > 0) {
        const allSlots = await connection_1.db
            .select()
            .from(StudentAvailabilityPlan_1.studentAvailabilitySlots)
            .where((0, drizzle_orm_1.inArray)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, planIds));
        for (const slot of allSlots) {
            if (!slotsMap[slot.planId])
                slotsMap[slot.planId] = [];
            slotsMap[slot.planId].push(slot);
        }
        const sessionCounts = await connection_1.db
            .select({
            planId: StudentAvailabilityPlan_1.studentPlanSessions.planId,
            count: (0, drizzle_orm_1.sql) `COUNT(*)`,
        })
            .from(StudentAvailabilityPlan_1.studentPlanSessions)
            .where((0, drizzle_orm_1.inArray)(StudentAvailabilityPlan_1.studentPlanSessions.planId, planIds))
            .groupBy(StudentAvailabilityPlan_1.studentPlanSessions.planId);
        for (const sc of sessionCounts) {
            sessionCountMap[sc.planId] = Number(sc.count);
        }
    }
    const items = plans.map((p) => ({
        ...p,
        slots: slotsMap[p.id] || [],
        proposedSessionsCount: sessionCountMap[p.id] || 0,
    }));
    return (0, response_1.SuccessResponse)(res, {
        items,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
    });
};
exports.getMyAvailabilityPlans = getMyAvailabilityPlans;
// ── 3. Get Single Availability Plan by ID ───────────────────────────────────
const getMyAvailabilityPlanById = async (req, res) => {
    const studentId = getStudentId(req);
    const { id } = req.params;
    const [plan] = await connection_1.db
        .select({
        id: StudentAvailabilityPlan_1.studentAvailabilityPlans.id,
        studentId: StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId,
        title: StudentAvailabilityPlan_1.studentAvailabilityPlans.title,
        notes: StudentAvailabilityPlan_1.studentAvailabilityPlans.notes,
        status: StudentAvailabilityPlan_1.studentAvailabilityPlans.status,
        adminNotes: StudentAvailabilityPlan_1.studentAvailabilityPlans.adminNotes,
        studentFeedback: StudentAvailabilityPlan_1.studentAvailabilityPlans.studentFeedback,
        proposedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.proposedAt,
        respondedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.respondedAt,
        createdAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.createdAt,
        updatedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.updatedAt,
    })
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id), (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, studentId)))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    const slots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, id));
    // Fetch proposed sessions with details (including per-session student response)
    const proposedSessions = await connection_1.db
        .select({
        planSessionId: StudentAvailabilityPlan_1.studentPlanSessions.id,
        planSessionNotes: StudentAvailabilityPlan_1.studentPlanSessions.notes,
        orderIndex: StudentAvailabilityPlan_1.studentPlanSessions.orderIndex,
        studentResponse: StudentAvailabilityPlan_1.studentPlanSessions.studentResponse,
        sessionId: Session_1.sessions.id,
        sessionName: Session_1.sessions.name,
        scheduleType: Session_1.sessions.scheduleType,
        sessionDate: Session_1.sessions.sessionDate,
        startDate: Session_1.sessions.startDate,
        endDate: Session_1.sessions.endDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        sessionLink: Session_1.sessions.session_link,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        teacherId: Session_1.sessions.teacherId,
        teacherName: teacher_1.teachers.name,
    })
        .from(StudentAvailabilityPlan_1.studentPlanSessions)
        .innerJoin(Session_1.sessions, (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentPlanSessions.sessionId, Session_1.sessions.id))
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacher_1.teachers.id))
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentPlanSessions.planId, id))
        .orderBy(StudentAvailabilityPlan_1.studentPlanSessions.orderIndex, Session_1.sessions.sessionDate, Session_1.sessions.timeFrom);
    return (0, response_1.SuccessResponse)(res, {
        plan: {
            ...plan,
            slots,
            proposedSessions,
        },
    });
};
exports.getMyAvailabilityPlanById = getMyAvailabilityPlanById;
// ── 4. Respond to Proposed Plan (Accept / Reject) ───────────────────────────
const respondToProposedPlan = async (req, res) => {
    const studentId = getStudentId(req);
    const { id } = req.params;
    const { action, feedback } = req.body;
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id), (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, studentId)))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    if (plan.status === "pending_admin_review") {
        throw new Errors_1.BadRequest("The admin has not yet proposed sessions for this plan.");
    }
    if (plan.status === "accepted") {
        throw new Errors_1.BadRequest("This plan has already been accepted.");
    }
    if (plan.status === "cancelled") {
        throw new Errors_1.BadRequest("This plan was cancelled and cannot be responded to.");
    }
    if (action === "accept") {
        // Fetch all sessions proposed for this plan (with their plan-session row id)
        const assignedSessions = await connection_1.db
            .select({ id: StudentAvailabilityPlan_1.studentPlanSessions.id, sessionId: StudentAvailabilityPlan_1.studentPlanSessions.sessionId })
            .from(StudentAvailabilityPlan_1.studentPlanSessions)
            .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentPlanSessions.planId, id));
        if (assignedSessions.length === 0) {
            throw new Errors_1.BadRequest("Cannot accept a plan with no proposed sessions.");
        }
        // Student may optionally pass session IDs they want to reject (partial acceptance)
        const { rejectedSessionIds = [] } = req.body;
        const rejectedSet = new Set(rejectedSessionIds);
        // Validate: all rejected IDs must actually belong to this plan
        const planSessionIds = new Set(assignedSessions.map((s) => s.sessionId));
        for (const rId of rejectedSet) {
            if (!planSessionIds.has(rId)) {
                throw new Errors_1.BadRequest(`Session "${rId}" is not part of this plan.`);
            }
        }
        // Student must keep at least one session — cannot reject all
        const acceptedSessions = assignedSessions.filter((s) => !rejectedSet.has(s.sessionId));
        if (acceptedSessions.length === 0) {
            throw new Errors_1.BadRequest("You must accept at least one session. To decline the entire plan use action 'reject'.");
        }
        // ── Mark each plan-session row with the student's per-session response ──
        for (const ps of assignedSessions) {
            await connection_1.db
                .update(StudentAvailabilityPlan_1.studentPlanSessions)
                .set({ studentResponse: rejectedSet.has(ps.sessionId) ? "rejected" : "accepted" })
                .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentPlanSessions.id, ps.id));
        }
        // ── Enroll student only in accepted sessions ──────────────────────────
        const acceptedSessionIds = acceptedSessions.map((s) => s.sessionId);
        const existingEnrollments = await connection_1.db
            .select({ sessionId: Session_1.sessionUsers.sessionId })
            .from(Session_1.sessionUsers)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId), (0, drizzle_orm_1.inArray)(Session_1.sessionUsers.sessionId, acceptedSessionIds)));
        const enrolledSet = new Set(existingEnrollments.map((e) => e.sessionId));
        const newEnrollments = acceptedSessionIds
            .filter((sId) => !enrolledSet.has(sId))
            .map((sId) => ({
            id: (0, crypto_1.randomUUID)(),
            sessionId: sId,
            studentId,
        }));
        if (newEnrollments.length > 0) {
            await connection_1.db.insert(Session_1.sessionUsers).values(newEnrollments);
        }
        // ── Mark the plan itself as accepted ──────────────────────────────────
        await connection_1.db
            .update(StudentAvailabilityPlan_1.studentAvailabilityPlans)
            .set({
            status: "accepted",
            studentFeedback: feedback || null,
            respondedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
        const rejectedCount = rejectedSet.size;
        const acceptedCount = acceptedSessions.length;
        await (0, studentNotification_1.sendStudentNotification)(studentId, `You have accepted the study plan "${plan.title}" with ${acceptedCount} session(s)` +
            (rejectedCount > 0 ? ` and rejected ${rejectedCount} session(s).` : "."));
        return (0, response_1.SuccessResponse)(res, {
            message: `Plan accepted. Enrolled in ${acceptedCount} session(s)${rejectedCount > 0 ? `, ${rejectedCount} session(s) skipped.` : "."}`,
            acceptedCount,
            rejectedCount,
            newlyEnrolledCount: newEnrollments.length,
            status: "accepted",
        });
    }
    if (action === "reject") {
        await connection_1.db
            .update(StudentAvailabilityPlan_1.studentAvailabilityPlans)
            .set({
            status: "rejected",
            studentFeedback: feedback || null,
            respondedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
        await (0, studentNotification_1.sendStudentNotification)(studentId, `You have rejected the proposed schedule for "${plan.title}". The admin will review your feedback and propose alternative sessions.`);
        return (0, response_1.SuccessResponse)(res, {
            message: "Plan rejected. Your feedback has been recorded for admin review.",
            status: "rejected",
        });
    }
    throw new Errors_1.BadRequest("Invalid action. Must be 'accept' or 'reject'.");
};
exports.respondToProposedPlan = respondToProposedPlan;
// ── 5. Cancel Plan (Only if pending admin review) ───────────────────────────
const cancelAvailabilityPlan = async (req, res) => {
    const studentId = getStudentId(req);
    const { id } = req.params;
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id), (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, studentId)))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    if (plan.status !== "pending_admin_review") {
        throw new Errors_1.BadRequest("Cannot cancel a plan that has already been processed or answered.");
    }
    await connection_1.db
        .update(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .set({ status: "cancelled" })
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Availability plan cancelled successfully." });
};
exports.cancelAvailabilityPlan = cancelAvailabilityPlan;
// ── 6. Update Availability Plan ─────────────────────────────────────────────
const updateAvailabilityPlan = async (req, res) => {
    const studentId = getStudentId(req);
    const { id } = req.params;
    const { title, notes, slots, slotIds } = req.body;
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id), (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, studentId)))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    if (plan.status === "accepted") {
        throw new Errors_1.BadRequest("Cannot update an already accepted plan.");
    }
    if (plan.status === "cancelled") {
        throw new Errors_1.BadRequest("Cannot update a cancelled plan.");
    }
    const updateData = {};
    if (title !== undefined)
        updateData.title = title;
    if (notes !== undefined)
        updateData.notes = notes;
    const hasNewSlots = (slotIds && Array.isArray(slotIds) && slotIds.length > 0) ||
        (slots && Array.isArray(slots) && slots.length > 0);
    // If slots are updated, reset status back to pending_admin_review if it was rejected or proposed
    if (hasNewSlots) {
        if (plan.status === "rejected" || plan.status === "plan_proposed") {
            updateData.status = "pending_admin_review";
        }
    }
    if (Object.keys(updateData).length > 0) {
        await connection_1.db
            .update(StudentAvailabilityPlan_1.studentAvailabilityPlans)
            .set(updateData)
            .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
    }
    if (hasNewSlots) {
        const slotInserts = await resolveAndPrepareSlots(id, slotIds, slots);
        if (slotInserts.length > 0) {
            await connection_1.db.delete(StudentAvailabilityPlan_1.studentAvailabilitySlots).where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, id));
            await connection_1.db.insert(StudentAvailabilityPlan_1.studentAvailabilitySlots).values(slotInserts);
        }
    }
    const [updatedPlan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
    const updatedSlots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, id));
    return (0, response_1.SuccessResponse)(res, {
        message: "Availability plan updated successfully.",
        plan: {
            ...updatedPlan,
            slots: updatedSlots,
        },
    });
};
exports.updateAvailabilityPlan = updateAvailabilityPlan;
