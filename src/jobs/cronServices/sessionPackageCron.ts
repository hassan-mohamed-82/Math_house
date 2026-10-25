import cron from "node-cron";
import { randomUUID } from "crypto";
import { pool, db } from "../../models/connection";
import {
    sessions,
    sessionUsers,
    sessionGroups,
    sessionLessons,
    sessionAttendance,
    sessionPackageDeductions,
} from "../../models/schema/admin/Session";
import { groupStudents } from "../../models/schema/admin/Groups";
import { Student } from "../../models/schema/admin/Student";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * Returns Cairo local date and time parts.
 */
export const cairoNow = () => {
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

/**
 * Deducts 1 session from a single student's live balance for a given session,
 * respecting the Re-Explanation rules and avoiding duplicate deductions.
 */
export async function deductSingleStudentSession(
    sessionId: string,
    studentId: string,
    sessionRelationalType: string | null
): Promise<{ deducted: boolean; reason?: string }> {
    try {
        // 1. Check if already deducted
        const [existingDeduction] = await db
            .select({ id: sessionPackageDeductions.id })
            .from(sessionPackageDeductions)
            .where(and(
                eq(sessionPackageDeductions.sessionId, sessionId),
                eq(sessionPackageDeductions.studentId, studentId)
            ))
            .limit(1);

        if (existingDeduction) {
            return { deducted: false, reason: "already_deducted" };
        }

        // 2. Re-Explanation logic:
        // Do not deduct balance if student already attended all of this session's lessons previously.
        let shouldDeduct = true;
        if (sessionRelationalType === "Re-Explanation") {
            const sessionLessonRows = await db
                .select({ lessonId: sessionLessons.lessonId })
                .from(sessionLessons)
                .where(eq(sessionLessons.sessionId, sessionId));

            const lessonIds = sessionLessonRows.map(r => r.lessonId);
            if (lessonIds.length > 0) {
                const previouslyAttendedRows = await db
                    .select({ lessonId: sessionLessons.lessonId })
                    .from(sessionAttendance)
                    .innerJoin(sessionLessons, eq(sessionAttendance.sessionId, sessionLessons.sessionId))
                    .where(and(
                        eq(sessionAttendance.studentId, studentId),
                        eq(sessionAttendance.status, "present"),
                        sql`${sessionAttendance.sessionId} != ${sessionId}`,
                        inArray(sessionLessons.lessonId, lessonIds)
                    ));

                const attendedLessonIdSet = new Set(previouslyAttendedRows.map(r => r.lessonId));
                if (lessonIds.every(id => attendedLessonIdSet.has(id))) {
                    shouldDeduct = false;
                }
            }
        }

        if (!shouldDeduct) {
            // Mark as processed so we don't re-check every run
            await db.insert(sessionPackageDeductions).values({
                id: randomUUID(),
                sessionId,
                studentId,
                deductedAt: new Date(),
            }).catch(() => {});
            return { deducted: false, reason: "re_explanation_exempt" };
        }

        // 3. Atomic deduction from student's live balance
        const [result] = await db
            .update(Student)
            .set({ livebalance: sql`${Student.livebalance} - 1` })
            .where(and(eq(Student.id, studentId), sql`${Student.livebalance} > 0`));

        const affected = (result as any)?.affectedRows ?? 0;
        if (affected > 0) {
            await db.insert(sessionPackageDeductions).values({
                id: randomUUID(),
                sessionId,
                studentId,
                deductedAt: new Date(),
            }).catch(() => {});

            console.log(`🎟️ [SessionPackageCron] Deducted 1 live session from student ${studentId} for session ${sessionId} (24h before)`);
            return { deducted: true };
        } else {
            console.warn(`⚠️ [SessionPackageCron] Student ${studentId} has insufficient live balance for session ${sessionId}`);
            return { deducted: false, reason: "insufficient_balance" };
        }
    } catch (err) {
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
export async function processUpcomingSessionsDeductions(targetStudentId?: string) {
    try {
        const { today, cairoDate } = cairoNow();
        const cairoNowMs = cairoDate.getTime();
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;

        // Fetch candidate sessions scheduled for today, tomorrow, or the day after
        // (covers any session within a 24-hour window from Cairo now)
        const candidateDateLimit = new Date(cairoNowMs + 48 * 60 * 60 * 1000);
        const limitYear = candidateDateLimit.getFullYear();
        const limitMonth = String(candidateDateLimit.getMonth() + 1).padStart(2, "0");
        const limitDay = String(candidateDateLimit.getDate()).padStart(2, "0");
        const dateLimitStr = `${limitYear}-${limitMonth}-${limitDay}`;

        const candidateSessions = await db
            .select({
                id: sessions.id,
                sessionDate: sessions.sessionDate,
                timeFrom: sessions.timeFrom,
                timeTo: sessions.timeTo,
                sessionRelationalType: sessions.sessionRelationalType,
            })
            .from(sessions)
            .where(and(
                sql`${sessions.sessionDate} >= ${today}`,
                sql`${sessions.sessionDate} <= ${dateLimitStr}`
            ));

        for (const session of candidateSessions) {
            if (!session.sessionDate || !session.timeFrom) continue;

            const sessionDateStr = String(session.sessionDate);
            const sessionStartMs = new Date(`${sessionDateStr}T${session.timeFrom}`).getTime();
            const sessionEndMs = new Date(`${sessionDateStr}T${session.timeTo || session.timeFrom}`).getTime();

            // Session is within 24h window if:
            // 1) sessionStart - now <= 24 hours
            // 2) session has not completely ended yet (sessionEnd >= now)
            const diffStartMs = sessionStartMs - cairoNowMs;
            const isWithin24Hours = diffStartMs <= twentyFourHoursMs && sessionEndMs >= cairoNowMs;

            if (!isWithin24Hours) continue;

            // Find enrolled students
            let enrolledStudentIds: string[] = [];

            if (targetStudentId) {
                // Check if target student is enrolled directly or via group
                const [direct] = await db
                    .select({ studentId: sessionUsers.studentId })
                    .from(sessionUsers)
                    .where(and(
                        eq(sessionUsers.sessionId, session.id),
                        eq(sessionUsers.studentId, targetStudentId)
                    ))
                    .limit(1);

                if (direct) {
                    enrolledStudentIds.push(targetStudentId);
                } else {
                    const [viaGroup] = await db
                        .select({ studentId: groupStudents.studentId })
                        .from(sessionGroups)
                        .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
                        .where(and(
                            eq(sessionGroups.sessionId, session.id),
                            eq(groupStudents.studentId, targetStudentId)
                        ))
                        .limit(1);
                    if (viaGroup) enrolledStudentIds.push(targetStudentId);
                }
            } else {
                // Fetch all direct students
                const directRows = await db
                    .select({ studentId: sessionUsers.studentId })
                    .from(sessionUsers)
                    .where(eq(sessionUsers.sessionId, session.id));

                // Fetch all group students
                const groupRows = await db
                    .select({ studentId: groupStudents.studentId })
                    .from(sessionGroups)
                    .innerJoin(groupStudents, eq(sessionGroups.groupId, groupStudents.groupId))
                    .where(eq(sessionGroups.sessionId, session.id));

                const studentSet = new Set<string>();
                directRows.forEach(r => studentSet.add(r.studentId));
                groupRows.forEach(r => studentSet.add(r.studentId));
                enrolledStudentIds = Array.from(studentSet);
            }

            for (const sId of enrolledStudentIds) {
                await deductSingleStudentSession(session.id, sId, session.sessionRelationalType);
            }
        }
    } catch (err) {
        console.error("❌ [SessionPackageCron] Error processing 24h session deductions:", err);
    }
}

/**
 * Starts the recurring cron job (every 15 minutes) to deduct package sessions
 * 24 hours prior to upcoming sessions.
 */
export const startSessionPackageCron = () => {
    // Run table check and initial pass
    processUpcomingSessionsDeductions();

    // Schedule: every 15 minutes
    cron.schedule("*/15 * * * *", async () => {
        console.log("🔄 [SessionPackageCron] Checking upcoming sessions within 24 hours...");
        await processUpcomingSessionsDeductions();
    });

    console.log("⏰ [SessionPackageCron] 24-hour upcoming session package deduction scheduled (every 15 minutes)");
};
