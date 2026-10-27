"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSessionPackageCron = exports.cairoNow = void 0;
exports.deductSingleStudentSession = deductSingleStudentSession;
exports.processUpcomingSessionsDeductions = processUpcomingSessionsDeductions;
const node_cron_1 = __importDefault(require("node-cron"));
const crypto_1 = require("crypto");
const connection_1 = require("../../models/connection");
const Session_1 = require("../../models/schema/admin/Session");
const Groups_1 = require("../../models/schema/admin/Groups");
const Student_1 = require("../../models/schema/admin/Student");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Returns Cairo local date and time parts.
 */
const cairoNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).formatToParts(new Date());
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    const hour = p.hour === "24" ? "00" : p.hour;
    return {
        today: `${p.year}-${p.month}-${p.day}`,
        currentTime: `${hour}:${p.minute}:${p.second}`,
        cairoDate: new Date(`${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}`),
    };
};
exports.cairoNow = cairoNow;
/**
 * Deducts 1 session from a single student's live balance for a given session,
 * respecting the Re-Explanation rules and avoiding duplicate deductions.
 */
async function deductSingleStudentSession(sessionId, studentId, sessionRelationalType) {
    try {
        // 1. Check if already deducted
        const [existingDeduction] = await connection_1.db
            .select({ id: Session_1.sessionPackageDeductions.id })
            .from(Session_1.sessionPackageDeductions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionPackageDeductions.sessionId, sessionId), (0, drizzle_orm_1.eq)(Session_1.sessionPackageDeductions.studentId, studentId)))
            .limit(1);
        if (existingDeduction) {
            return { deducted: false, reason: "already_deducted" };
        }
        // 2. Re-Explanation logic:
        // Do not deduct balance if student already attended all of this session's lessons previously.
        let shouldDeduct = true;
        if (sessionRelationalType === "Re-Explanation") {
            const sessionLessonRows = await connection_1.db
                .select({ lessonId: Session_1.sessionLessons.lessonId })
                .from(Session_1.sessionLessons)
                .where((0, drizzle_orm_1.eq)(Session_1.sessionLessons.sessionId, sessionId));
            const lessonIds = sessionLessonRows.map(r => r.lessonId);
            if (lessonIds.length > 0) {
                const previouslyAttendedRows = await connection_1.db
                    .select({ lessonId: Session_1.sessionLessons.lessonId })
                    .from(Session_1.sessionAttendance)
                    .innerJoin(Session_1.sessionLessons, (0, drizzle_orm_1.eq)(Session_1.sessionAttendance.sessionId, Session_1.sessionLessons.sessionId))
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionAttendance.studentId, studentId), (0, drizzle_orm_1.eq)(Session_1.sessionAttendance.status, "present"), (0, drizzle_orm_1.sql) `${Session_1.sessionAttendance.sessionId} != ${sessionId}`, (0, drizzle_orm_1.inArray)(Session_1.sessionLessons.lessonId, lessonIds)));
                const attendedLessonIdSet = new Set(previouslyAttendedRows.map(r => r.lessonId));
                if (lessonIds.every(id => attendedLessonIdSet.has(id))) {
                    shouldDeduct = false;
                }
            }
        }
        if (!shouldDeduct) {
            // Mark as processed so we don't re-check every run
            await connection_1.db.insert(Session_1.sessionPackageDeductions).values({
                id: (0, crypto_1.randomUUID)(),
                sessionId,
                studentId,
                deductedAt: new Date(),
            }).catch(() => { });
            return { deducted: false, reason: "re_explanation_exempt" };
        }
        // 3. Atomic deduction from student's live balance
        const [result] = await connection_1.db
            .update(Student_1.Student)
            .set({ livebalance: (0, drizzle_orm_1.sql) `${Student_1.Student.livebalance} - 1` })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Student_1.Student.id, studentId), (0, drizzle_orm_1.sql) `${Student_1.Student.livebalance} > 0`));
        const affected = result?.affectedRows ?? 0;
        if (affected > 0) {
            await connection_1.db.insert(Session_1.sessionPackageDeductions).values({
                id: (0, crypto_1.randomUUID)(),
                sessionId,
                studentId,
                deductedAt: new Date(),
            }).catch(() => { });
            console.log(`🎟️ [SessionPackageCron] Deducted 1 live session from student ${studentId} for session ${sessionId} (24h before)`);
            return { deducted: true };
        }
        else {
            console.warn(`⚠️ [SessionPackageCron] Student ${studentId} has insufficient live balance for session ${sessionId}`);
            return { deducted: false, reason: "insufficient_balance" };
        }
    }
    catch (err) {
        console.error(`❌ [SessionPackageCron] Failed to deduct for student ${studentId}, session ${sessionId}:`, err);
        return { deducted: false, reason: "error" };
    }
}
/**
 * Scans upcoming sessions starting within the next 24 hours (in Cairo time)
 * and deducts 1 live session from the package balance of all enrolled students.
 *
 * @param targetStudentId - Optional: If provided, only processes deductions for this specific student.
 */
async function processUpcomingSessionsDeductions(targetStudentId) {
    try {
        const { today, cairoDate } = (0, exports.cairoNow)();
        const cairoNowMs = cairoDate.getTime();
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;
        // Fetch candidate sessions scheduled for today, tomorrow, or the day after
        // (covers any session within a 24-hour window from Cairo now)
        const candidateDateLimit = new Date(cairoNowMs + 48 * 60 * 60 * 1000);
        const limitYear = candidateDateLimit.getFullYear();
        const limitMonth = String(candidateDateLimit.getMonth() + 1).padStart(2, "0");
        const limitDay = String(candidateDateLimit.getDate()).padStart(2, "0");
        const dateLimitStr = `${limitYear}-${limitMonth}-${limitDay}`;
        const candidateSessions = await connection_1.db
            .select({
            id: Session_1.sessions.id,
            sessionDate: Session_1.sessions.sessionDate,
            timeFrom: Session_1.sessions.timeFrom,
            timeTo: Session_1.sessions.timeTo,
            sessionRelationalType: Session_1.sessions.sessionRelationalType,
        })
            .from(Session_1.sessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `${Session_1.sessions.sessionDate} >= ${today}`, (0, drizzle_orm_1.sql) `${Session_1.sessions.sessionDate} <= ${dateLimitStr}`));
        for (const session of candidateSessions) {
            if (!session.sessionDate || !session.timeFrom)
                continue;
            const sessionDateStr = String(session.sessionDate);
            const sessionStartMs = new Date(`${sessionDateStr}T${session.timeFrom}`).getTime();
            const sessionEndMs = new Date(`${sessionDateStr}T${session.timeTo || session.timeFrom}`).getTime();
            // Session is within 24h window if:
            // 1) sessionStart - now <= 24 hours
            // 2) session has not completely ended yet (sessionEnd >= now)
            const diffStartMs = sessionStartMs - cairoNowMs;
            const isWithin24Hours = diffStartMs <= twentyFourHoursMs && sessionEndMs >= cairoNowMs;
            if (!isWithin24Hours)
                continue;
            // Find enrolled students
            let enrolledStudentIds = [];
            if (targetStudentId) {
                // Check if target student is enrolled directly or via group
                const [direct] = await connection_1.db
                    .select({ studentId: Session_1.sessionUsers.studentId })
                    .from(Session_1.sessionUsers)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, session.id), (0, drizzle_orm_1.eq)(Session_1.sessionUsers.studentId, targetStudentId)))
                    .limit(1);
                if (direct) {
                    enrolledStudentIds.push(targetStudentId);
                }
                else {
                    const [viaGroup] = await connection_1.db
                        .select({ studentId: Groups_1.groupStudents.studentId })
                        .from(Session_1.sessionGroups)
                        .innerJoin(Groups_1.groupStudents, (0, drizzle_orm_1.eq)(Session_1.sessionGroups.groupId, Groups_1.groupStudents.groupId))
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(Session_1.sessionGroups.sessionId, session.id), (0, drizzle_orm_1.eq)(Groups_1.groupStudents.studentId, targetStudentId)))
                        .limit(1);
                    if (viaGroup)
                        enrolledStudentIds.push(targetStudentId);
                }
            }
            else {
                // Fetch all direct students
                const directRows = await connection_1.db
                    .select({ studentId: Session_1.sessionUsers.studentId })
                    .from(Session_1.sessionUsers)
                    .where((0, drizzle_orm_1.eq)(Session_1.sessionUsers.sessionId, session.id));
                // Fetch all group students
                const groupRows = await connection_1.db
                    .select({ studentId: Groups_1.groupStudents.studentId })
                    .from(Session_1.sessionGroups)
                    .innerJoin(Groups_1.groupStudents, (0, drizzle_orm_1.eq)(Session_1.sessionGroups.groupId, Groups_1.groupStudents.groupId))
                    .where((0, drizzle_orm_1.eq)(Session_1.sessionGroups.sessionId, session.id));
                const studentSet = new Set();
                directRows.forEach(r => studentSet.add(r.studentId));
                groupRows.forEach(r => studentSet.add(r.studentId));
                enrolledStudentIds = Array.from(studentSet);
            }
            for (const sId of enrolledStudentIds) {
                await deductSingleStudentSession(session.id, sId, session.sessionRelationalType);
            }
        }
    }
    catch (err) {
        console.error("❌ [SessionPackageCron] Error processing 24h session deductions:", err);
    }
}
/**
 * Starts the recurring cron job (every 15 minutes) to deduct package sessions
 * 24 hours prior to upcoming sessions.
 */
const startSessionPackageCron = () => {
    // Run table check and initial pass
    processUpcomingSessionsDeductions();
    // Schedule: every 15 minutes
    node_cron_1.default.schedule("*/15 * * * *", async () => {
        console.log("🔄 [SessionPackageCron] Checking upcoming sessions within 24 hours...");
        await processUpcomingSessionsDeductions();
    });
    console.log("⏰ [SessionPackageCron] 24-hour upcoming session package deduction scheduled (every 15 minutes)");
};
exports.startSessionPackageCron = startSessionPackageCron;
