"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAvailabilityPlan = exports.updatePlanStatus = exports.proposeSessionsForPlan = exports.getMatchingSessionsForPlan = exports.getAvailabilityPlanById = exports.getAllAvailabilityPlans = void 0;
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const StudentAvailabilityPlan_1 = require("../../models/schema/admin/StudentAvailabilityPlan");
const Student_1 = require("../../models/schema/admin/Student");
const Session_1 = require("../../models/schema/admin/Session");
const teacher_1 = require("../../models/schema/admin/teacher");
const admin_1 = require("../../models/schema/admin/admin");
const grade_1 = require("../../models/schema/admin/grade");
const lessons_1 = require("../../models/schema/admin/lessons");
const category_1 = require("../../models/schema/admin/category");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const studentNotification_1 = require("../../utils/studentNotification");
// ── 1. Get All Availability Plans (Admin) ───────────────────────────────────
const getAllAvailabilityPlans = async (req, res) => {
    const { status, studentId, search, page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;
    const conditions = [];
    if (status && typeof status === "string") {
        conditions.push((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.status, status));
    }
    if (studentId && typeof studentId === "string") {
        conditions.push((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, studentId));
    }
    if (search && typeof search === "string") {
        const searchTerm = `%${search}%`;
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(StudentAvailabilityPlan_1.studentAvailabilityPlans.title, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.firstname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.lastname, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.email, searchTerm), (0, drizzle_orm_1.like)(Student_1.Student.phone, searchTerm)));
    }
    const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    const [countResult] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${StudentAvailabilityPlan_1.studentAvailabilityPlans.id})` })
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, Student_1.Student.id))
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
        student: {
            id: Student_1.Student.id,
            firstname: Student_1.Student.firstname,
            lastname: Student_1.Student.lastname,
            email: Student_1.Student.email,
            phone: Student_1.Student.phone,
            gradeId: Student_1.Student.grade,
            categoryId: Student_1.Student.category,
        },
    })
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, Student_1.Student.id))
        .where(whereClause)
        .orderBy((0, drizzle_orm_1.desc)(StudentAvailabilityPlan_1.studentAvailabilityPlans.createdAt))
        .limit(limitNum)
        .offset(offset);
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
exports.getAllAvailabilityPlans = getAllAvailabilityPlans;
// ── 2. Get Single Availability Plan by ID (Admin) ───────────────────────────
const getAvailabilityPlanById = async (req, res) => {
    const { id } = req.params;
    const [plan] = await connection_1.db
        .select({
        id: StudentAvailabilityPlan_1.studentAvailabilityPlans.id,
        title: StudentAvailabilityPlan_1.studentAvailabilityPlans.title,
        notes: StudentAvailabilityPlan_1.studentAvailabilityPlans.notes,
        status: StudentAvailabilityPlan_1.studentAvailabilityPlans.status,
        adminNotes: StudentAvailabilityPlan_1.studentAvailabilityPlans.adminNotes,
        studentFeedback: StudentAvailabilityPlan_1.studentAvailabilityPlans.studentFeedback,
        proposedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.proposedAt,
        respondedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.respondedAt,
        createdAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.createdAt,
        updatedAt: StudentAvailabilityPlan_1.studentAvailabilityPlans.updatedAt,
        student: {
            id: Student_1.Student.id,
            firstname: Student_1.Student.firstname,
            lastname: Student_1.Student.lastname,
            email: Student_1.Student.email,
            phone: Student_1.Student.phone,
            avatar: Student_1.Student.avatar,
            livebalance: Student_1.Student.livebalance,
            gradeId: Student_1.Student.grade,
            categoryId: Student_1.Student.category,
        },
        proposedByAdmin: {
            id: admin_1.admins.id,
            name: admin_1.admins.name,
        },
    })
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .innerJoin(Student_1.Student, (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.studentId, Student_1.Student.id))
        .leftJoin(admin_1.admins, (0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.proposedBy, admin_1.admins.id))
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    // Get grade and category details for the student
    const [studentGrade] = plan.student.gradeId
        ? await connection_1.db.select().from(grade_1.grade).where((0, drizzle_orm_1.eq)(grade_1.grade.id, plan.student.gradeId)).limit(1)
        : [null];
    const [studentCategory] = plan.student.categoryId
        ? await connection_1.db.select().from(category_1.category).where((0, drizzle_orm_1.eq)(category_1.category.id, plan.student.categoryId)).limit(1)
        : [null];
    const slots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, id));
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
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        sessionLink: Session_1.sessions.session_link,
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
exports.getAvailabilityPlanById = getAvailabilityPlanById;
// ── 3. Suggest Sessions Matching Student Availability (Admin Helper) ────────
const getMatchingSessionsForPlan = async (req, res) => {
    const { id } = req.params;
    // ── Load plan ──────────────────────────────────────────────────────────────
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    const studentId = plan.studentId;
    // ── Load student availability slots for this plan ─────────────────────────
    const slots = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilitySlots)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilitySlots.planId, id));
    const todayStr = new Date().toISOString().split("T")[0];
    // ── Fetch upcoming sessions ───────────────────────────────────────────────
    const upcomingSessions = await connection_1.db
        .select({
        id: Session_1.sessions.id,
        name: Session_1.sessions.name,
        scheduleType: Session_1.sessions.scheduleType,
        sessionDate: Session_1.sessions.sessionDate,
        startDate: Session_1.sessions.startDate,
        endDate: Session_1.sessions.endDate,
        timeFrom: Session_1.sessions.timeFrom,
        timeTo: Session_1.sessions.timeTo,
        sessionRelationalType: Session_1.sessions.sessionRelationalType,
        teacherId: Session_1.sessions.teacherId,
        teacherName: teacher_1.teachers.name,
    })
        .from(Session_1.sessions)
        .leftJoin(teacher_1.teachers, (0, drizzle_orm_1.eq)(Session_1.sessions.teacherId, teacher_1.teachers.id))
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.gte)(Session_1.sessions.sessionDate, new Date(todayStr)), (0, drizzle_orm_1.gte)(Session_1.sessions.endDate, new Date(todayStr))))
        .orderBy(Session_1.sessions.sessionDate, Session_1.sessions.timeFrom)
        .limit(200);
    if (upcomingSessions.length === 0) {
        return (0, response_1.SuccessResponse)(res, { planSlots: slots, candidateSessions: [] });
    }
    const allSessionIds = upcomingSessions.map((s) => s.id);
    // ── Fetch lessons linked to each session ──────────────────────────────────
    const allSessionLessons = await connection_1.db
        .select({
        sessionId: Session_1.sessionLessons.sessionId,
        lessonId: lessons_1.lessons.id,
        lessonName: lessons_1.lessons.name,
        lessonOrder: lessons_1.lessons.order,
    })
        .from(Session_1.sessionLessons)
        .innerJoin(lessons_1.lessons, (0, drizzle_orm_1.eq)(Session_1.sessionLessons.lessonId, lessons_1.lessons.id))
        .where((0, drizzle_orm_1.inArray)(Session_1.sessionLessons.sessionId, allSessionIds));
    // Build a lookup: sessionId → lesson[]  
    const lessonsMap = {};
    for (const sl of allSessionLessons) {
        if (!lessonsMap[sl.sessionId])
            lessonsMap[sl.sessionId] = [];
        lessonsMap[sl.sessionId].push({
            lessonId: sl.lessonId,
            lessonName: sl.lessonName,
            lessonOrder: sl.lessonOrder ?? 0,
        });
    }
    // ── Check which sessions the student is already enrolled in ───────────────
    const enrolledRows = await connection_1.db
        .select({ sessionId: Session_1.sessionUsers.sessionId })
        .from(Session_1.sessionUsers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, studentId), (0, drizzle_orm_1.inArray)(Session_1.sessionUsers.sessionId, allSessionIds)));
    const enrolledSessionIds = new Set(enrolledRows.map((r) => r.sessionId));
    // ── Helper ────────────────────────────────────────────────────────────────
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(":").map(Number);
        return h * 60 + m;
    };
    // ── Match each session against student availability slots ─────────────────
    const matchedSessions = [];
    for (const session of upcomingSessions) {
        const matchingSlots = [];
        for (const slot of slots) {
            let matchesDayOrDate = false;
            if (slot.specificDate && session.sessionDate) {
                const sDate = new Date(session.sessionDate).toISOString().split("T")[0];
                const targetDate = typeof slot.specificDate === "string"
                    ? slot.specificDate
                    : new Date(slot.specificDate).toISOString().split("T")[0];
                if (sDate === targetDate)
                    matchesDayOrDate = true;
            }
            else if (slot.dayOfWeek && session.sessionDate) {
                const sDay = dayNames[new Date(session.sessionDate).getUTCDay()];
                if (sDay.toLowerCase() === slot.dayOfWeek.toLowerCase())
                    matchesDayOrDate = true;
            }
            if (matchesDayOrDate) {
                const sessionStart = toMinutes(session.timeFrom);
                const sessionEnd = toMinutes(session.timeTo);
                const slotStart = toMinutes(slot.timeFrom);
                const slotEnd = toMinutes(slot.timeTo);
                // Overlap: session starts before slot ends AND session ends after slot starts
                const overlapsTime = sessionStart < slotEnd && sessionEnd > slotStart;
                if (overlapsTime) {
                    matchingSlots.push({
                        slotId: slot.id,
                        dayOfWeek: slot.dayOfWeek ?? null,
                        specificDate: slot.specificDate
                            ? (typeof slot.specificDate === "string"
                                ? slot.specificDate
                                : new Date(slot.specificDate).toISOString().split("T")[0])
                            : null,
                        timeFrom: slot.timeFrom,
                        timeTo: slot.timeTo,
                    });
                }
            }
        }
        // ── Only include sessions that match at least one slot ────────────────
        if (matchingSlots.length === 0)
            continue;
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
        if (da !== db_)
            return da - db_;
        return toMinutes(a.timeFrom) - toMinutes(b.timeFrom);
    });
    return (0, response_1.SuccessResponse)(res, {
        planSlots: slots,
        candidateSessions: matchedSessions,
    });
};
exports.getMatchingSessionsForPlan = getMatchingSessionsForPlan;
// ── 4. Propose Sessions for Plan (Admin) ────────────────────────────────────
const proposeSessionsForPlan = async (req, res) => {
    const { id } = req.params;
    const { sessionIds, adminNotes, sessionNotes } = req.body;
    const adminId = req.user?.id;
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    if (plan.status === "cancelled") {
        throw new Errors_1.BadRequest("Cannot propose sessions for a cancelled plan");
    }
    // Verify all session IDs exist
    const uniqueSessionIds = Array.from(new Set(sessionIds));
    const foundSessions = await connection_1.db
        .select({ id: Session_1.sessions.id, name: Session_1.sessions.name })
        .from(Session_1.sessions)
        .where((0, drizzle_orm_1.inArray)(Session_1.sessions.id, uniqueSessionIds));
    if (foundSessions.length !== uniqueSessionIds.length) {
        throw new Errors_1.BadRequest("One or more selected sessions were not found");
    }
    // Build session notes lookup if provided
    const notesMap = {};
    if (sessionNotes && Array.isArray(sessionNotes)) {
        for (const sn of sessionNotes) {
            if (sn.sessionId && sn.notes) {
                notesMap[sn.sessionId] = sn.notes;
            }
        }
    }
    // Replace current proposed sessions
    await connection_1.db.delete(StudentAvailabilityPlan_1.studentPlanSessions).where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentPlanSessions.planId, id));
    const planSessionInserts = uniqueSessionIds.map((sessionId, idx) => ({
        id: (0, crypto_1.randomUUID)(),
        planId: id,
        sessionId,
        notes: notesMap[sessionId] || null,
        orderIndex: idx + 1,
    }));
    await connection_1.db.insert(StudentAvailabilityPlan_1.studentPlanSessions).values(planSessionInserts);
    // Update plan status and proposal info
    await connection_1.db
        .update(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .set({
        status: "plan_proposed",
        adminNotes: adminNotes !== undefined ? adminNotes : plan.adminNotes,
        proposedBy: adminId || null,
        proposedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
    // Send notification to the student
    await (0, studentNotification_1.sendStudentNotification)(plan.studentId, `Admin has prepared a study plan for "${plan.title}" with ${uniqueSessionIds.length} proposed sessions. Please review and accept or reject the plan.`);
    return (0, response_1.SuccessResponse)(res, {
        message: `Proposed ${uniqueSessionIds.length} sessions for the student plan successfully. Student has been notified.`,
        planId: id,
        status: "plan_proposed",
        proposedSessionsCount: uniqueSessionIds.length,
    });
};
exports.proposeSessionsForPlan = proposeSessionsForPlan;
// ── 5. Update Plan Status (Admin) ──────────────────────────────────────────
const updatePlanStatus = async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    const updateData = { status };
    if (adminNotes !== undefined) {
        updateData.adminNotes = adminNotes;
    }
    await connection_1.db
        .update(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
    return (0, response_1.SuccessResponse)(res, {
        message: `Plan status updated to '${status}'.`,
        planId: id,
        status,
    });
};
exports.updatePlanStatus = updatePlanStatus;
// ── 6. Delete Availability Plan (Admin) ─────────────────────────────────────
const deleteAvailabilityPlan = async (req, res) => {
    const { id } = req.params;
    const [plan] = await connection_1.db
        .select()
        .from(StudentAvailabilityPlan_1.studentAvailabilityPlans)
        .where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id))
        .limit(1);
    if (!plan) {
        throw new Errors_1.NotFound("Availability plan not found");
    }
    // Cascade handles slots and plan sessions
    await connection_1.db.delete(StudentAvailabilityPlan_1.studentAvailabilityPlans).where((0, drizzle_orm_1.eq)(StudentAvailabilityPlan_1.studentAvailabilityPlans.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Availability plan deleted successfully." });
};
exports.deleteAvailabilityPlan = deleteAvailabilityPlan;
