import { Request, Response } from "express";
import { db } from "../../models/connection";
import {
    sessions,
    sessionAttendance,
    sessionStudentRatings,
    teachers,
    Student,
    courses,
    payment,
    studentAvailabilityPlans,
    enrolledItems,
    extraHomeworkStudents,
} from "../../models/schema";
import { eq, and, gte, lte, sql, count, avg, sum, desc, inArray, isNull, isNotNull } from "drizzle-orm";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type DateRangeResult = {
    startDate: Date;
    endDate: Date;
    prevStartDate: Date;
    prevEndDate: Date;
    filterType: "last_7_days" | "this_month" | "custom";
    rangeLabel: string;
    vsPreviousLabel: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format Day label (e.g. "Wed 21")
// ─────────────────────────────────────────────────────────────────────────────
function formatDayLabel(d: Date): string {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = days[d.getDay()];
    const dayNum = d.getDate();
    return `${dayName} ${dayNum}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format Date range label (e.g. "Oct 21 – Oct 27")
// ─────────────────────────────────────────────────────────────────────────────
function formatDateRangeLabel(start: Date, end: Date): string {
    const startMonth = start.toLocaleDateString("en-US", { month: "short" });
    const endMonth = end.toLocaleDateString("en-US", { month: "short" });
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay} – ${endDay}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: calculate percentage change and indicator
// ─────────────────────────────────────────────────────────────────────────────
function calculateChange(current: number, previous: number): {
    change: number | null;
    changeType: "increase" | "decrease" | "neutral";
} {
    if (previous === 0) {
        if (current === 0) return { change: 0, changeType: "neutral" };
        return { change: 100, changeType: "increase" };
    }
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    return {
        change: Math.abs(pct),
        changeType: pct > 0 ? "increase" : pct < 0 ? "decrease" : "neutral",
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: detect country from student or parent phone
// ─────────────────────────────────────────────────────────────────────────────
function detectCountry(phone?: string | null): string {
    if (!phone) return "Egypt";
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
    if (cleaned.startsWith("20") || cleaned.startsWith("0020") || /^01[0125]/.test(cleaned)) {
        return "Egypt";
    }
    if (cleaned.startsWith("966") || cleaned.startsWith("00966")) {
        return "Saudi Arabia";
    }
    if (cleaned.startsWith("971") || cleaned.startsWith("00971")) {
        return "UAE";
    }
    if (cleaned.startsWith("974") || cleaned.startsWith("00974")) {
        return "Qatar";
    }
    if (cleaned.startsWith("965") || cleaned.startsWith("00965")) {
        return "Kuwait";
    }
    if (cleaned.startsWith("44") || cleaned.startsWith("0044")) {
        return "UK";
    }
    if (cleaned.startsWith("1") || cleaned.startsWith("001")) {
        return "USA";
    }
    return "Egypt";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve date range from query params
// ─────────────────────────────────────────────────────────────────────────────
function resolveDateRange(query: Record<string, any>): DateRangeResult {
    const rawFilter = String(query.filter || "").toLowerCase().trim();
    const { startDate: qStart, endDate: qEnd } = query;
    const now = new Date();

    if (rawFilter === "this_month" || rawFilter === "month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1, 0, 0, 0, 0);

        return {
            startDate: start,
            endDate: end,
            prevStartDate: prevStart,
            prevEndDate: prevEnd,
            filterType: "this_month",
            rangeLabel: formatDateRangeLabel(start, end),
            vsPreviousLabel: "vs previous month",
        };
    }

    if (rawFilter === "custom") {
        if (!qStart || !qEnd) {
            throw new BadRequest("startDate and endDate are required for custom filter (format: YYYY-MM-DD)");
        }

        const start = new Date(qStart as string);
        const end = new Date(qEnd as string);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new BadRequest("Invalid date format. Use YYYY-MM-DD.");
        }
        if (start > end) {
            throw new BadRequest("startDate must be before or equal to endDate");
        }

        const rangeDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - rangeDays + 1);
        prevStart.setHours(0, 0, 0, 0);

        return {
            startDate: start,
            endDate: end,
            prevStartDate: prevStart,
            prevEndDate: prevEnd,
            filterType: "custom",
            rangeLabel: formatDateRangeLabel(start, end),
            vsPreviousLabel: `vs previous ${rangeDays} days`,
        };
    }

    // Default: Last 7 days (7_days, last_7_days, 7days, 7, or unspecified)
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - 6);
    prevStart.setHours(0, 0, 0, 0);

    return {
        startDate: start,
        endDate: end,
        prevStartDate: prevStart,
        prevEndDate: prevEnd,
        filterType: "last_7_days",
        rangeLabel: formatDateRangeLabel(start, end),
        vsPreviousLabel: "vs previous 7 days",
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /admin/dashboard
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboard = async (req: Request, res: Response) => {
    const {
        startDate,
        endDate,
        prevStartDate,
        prevEndDate,
        filterType,
        rangeLabel,
        vsPreviousLabel,
    } = resolveDateRange(req.query);

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);
    const prevStartStr = prevStartDate.toISOString().slice(0, 10);
    const prevEndStr = prevEndDate.toISOString().slice(0, 10);

    const sessionDateFilter = sql`(
        (${sessions.scheduleType} = 'once'   AND ${sessions.sessionDate} BETWEEN ${startStr} AND ${endStr})
        OR
        (${sessions.scheduleType} = 'repeat' AND ${sessions.startDate} <= ${endStr} AND ${sessions.endDate} >= ${startStr})
    )`;

    const prevSessionDateFilter = sql`(
        (${sessions.scheduleType} = 'once'   AND ${sessions.sessionDate} BETWEEN ${prevStartStr} AND ${prevEndStr})
        OR
        (${sessions.scheduleType} = 'repeat' AND ${sessions.startDate} <= ${prevEndStr} AND ${sessions.endDate} >= ${prevStartStr})
    )`;

    // ── 1. Sessions in range ────────────────────────────────────────────────
    const sessionList = await db
        .select({
            id: sessions.id,
            teacherId: sessions.teacherId,
            sessionDate: sessions.sessionDate,
            startDate: sessions.startDate,
            endDate: sessions.endDate,
            scheduleType: sessions.scheduleType,
        })
        .from(sessions)
        .where(sessionDateFilter);

    const sessionIds = sessionList.map((s) => s.id);

    // ── 2. Previous period sessions ─────────────────────────────────────────
    const prevSessionList = await db
        .select({ id: sessions.id })
        .from(sessions)
        .where(prevSessionDateFilter);

    // ── 3. Attendance in current range ──────────────────────────────────────
    let attendanceRows: { sessionId: string; studentId: string; status: string }[] = [];
    if (sessionIds.length > 0) {
        attendanceRows = await db
            .select({
                sessionId: sessionAttendance.sessionId,
                studentId: sessionAttendance.studentId,
                status: sessionAttendance.status,
            })
            .from(sessionAttendance)
            .where(inArray(sessionAttendance.sessionId, sessionIds));
    }

    const presentRows = attendanceRows.filter((r) => r.status === "present");
    const uniqueStudents = new Set(presentRows.map((r) => r.studentId));

    // ── 4. Previous period attendance ───────────────────────────────────────
    let prevPresentCount = 0;
    if (prevSessionList.length > 0) {
        const prevIds = prevSessionList.map((s) => s.id);
        const prevAttRows = await db
            .select({ studentId: sessionAttendance.studentId })
            .from(sessionAttendance)
            .where(and(inArray(sessionAttendance.sessionId, prevIds), eq(sessionAttendance.status, "present")));
        prevPresentCount = new Set(prevAttRows.map((r) => r.studentId)).size;
    }

    // ── 5. KPI: Sessions ────────────────────────────────────────────────────
    const totalSessions = sessionList.length;
    const prevTotalSessions = prevSessionList.length;
    const sessionsDelta = calculateChange(totalSessions, prevTotalSessions);

    // ── 6. KPI: Students attended ──────────────────────────────────────────
    const studentsAttended = uniqueStudents.size;
    const studentsDelta = calculateChange(studentsAttended, prevPresentCount);

    // ── 7. KPI: Avg per session ────────────────────────────────────────────
    const avgPerSession = totalSessions === 0 ? 0 : Math.round((studentsAttended / totalSessions) * 10) / 10;
    const prevAvg = prevTotalSessions === 0 ? 0 : Math.round((prevPresentCount / prevTotalSessions) * 10) / 10;
    const avgDelta = calculateChange(avgPerSession, prevAvg);

    // ── 8. KPI: Collected ──────────────────────────────────────────────────
    const collectedResult = await db
        .select({ total: sum(payment.amount) })
        .from(payment)
        .where(
            and(
                eq(payment.status, "completed"),
                gte(payment.createdAt, startDate),
                lte(payment.createdAt, endDate)
            )
        );
    const collected = Number(collectedResult[0]?.total ?? 0);

    // ── 9. KPI: Teacher rating ─────────────────────────────────────────────
    let avgTeacherRating: number | null = null;
    const ratingTeacherCount = new Set(sessionList.map((s) => s.teacherId)).size;

    if (sessionIds.length > 0) {
        const ratingResult = await db
            .select({ avgRating: avg(sessionStudentRatings.overallRating) })
            .from(sessionStudentRatings)
            .where(inArray(sessionStudentRatings.sessionId, sessionIds));

        if (ratingResult[0]?.avgRating != null) {
            avgTeacherRating = Math.round(Number(ratingResult[0].avgRating) * 10) / 10;
        }
    }

    // ── 10. Chart: Sessions & attendance breakdown by day ───────────────────
    const dayMap = new Map<string, { sessions: number }>();
    const dayCursor = new Date(startDate);
    dayCursor.setHours(0, 0, 0, 0);

    while (dayCursor <= endDate) {
        dayMap.set(dayCursor.toISOString().slice(0, 10), { sessions: 0 });
        dayCursor.setDate(dayCursor.getDate() + 1);
    }

    const sessionDateMap = new Map<string, string>(); // sessionId -> YYYY-MM-DD
    for (const sess of sessionList) {
        if (sess.scheduleType === "once" && sess.sessionDate) {
            const key = String(sess.sessionDate).slice(0, 10);
            if (dayMap.has(key)) dayMap.get(key)!.sessions += 1;
            sessionDateMap.set(sess.id, key);
        } else if (sess.scheduleType === "repeat" && sess.startDate && sess.endDate) {
            const sDate = new Date(String(sess.startDate));
            const eDate = new Date(String(sess.endDate));
            const cur = new Date(Math.max(sDate.getTime(), startDate.getTime()));
            cur.setHours(0, 0, 0, 0);
            const bound = new Date(Math.min(eDate.getTime(), endDate.getTime()));
            while (cur <= bound) {
                const key = cur.toISOString().slice(0, 10);
                if (dayMap.has(key)) dayMap.get(key)!.sessions += 1;
                cur.setDate(cur.getDate() + 1);
            }
            sessionDateMap.set(sess.id, String(sess.startDate).slice(0, 10));
        }
    }

    const dayStudentMap = new Map<string, Set<string>>();
    for (const row of presentRows) {
        const dateKey = sessionDateMap.get(row.sessionId);
        if (!dateKey || !dayMap.has(dateKey)) continue;
        if (!dayStudentMap.has(dateKey)) dayStudentMap.set(dateKey, new Set());
        dayStudentMap.get(dateKey)!.add(row.studentId);
    }

    const chartData = Array.from(dayMap.entries()).map(([dateStr, val]) => {
        const d = new Date(dateStr + "T00:00:00");
        return {
            date: dateStr,
            label: formatDayLabel(d),
            sessions: val.sessions,
            students: dayStudentMap.get(dateStr)?.size ?? 0,
        };
    });

    // ── 11. Sessions per teacher ────────────────────────────────────────────
    const teacherSessionMap = new Map<string, number>();
    for (const sess of sessionList) {
        teacherSessionMap.set(sess.teacherId, (teacherSessionMap.get(sess.teacherId) ?? 0) + 1);
    }

    const teacherIds = Array.from(teacherSessionMap.keys());
    let teacherNames: { id: string; name: string }[] = [];
    if (teacherIds.length > 0) {
        teacherNames = await db
            .select({ id: teachers.id, name: teachers.name })
            .from(teachers)
            .where(inArray(teachers.id, teacherIds));
    }

    const sessionsPerTeacher = teacherNames
        .map((t) => ({
            teacherId: t.id,
            teacherName: t.name,
            sessionCount: teacherSessionMap.get(t.id) ?? 0,
        }))
        .sort((a, b) => b.sessionCount - a.sessionCount);

    // ── 12. Students per course (Enrolled right now) ────────────────────────
    const courseEnrollmentRows = await db
        .select({
            courseId: enrolledItems.courseId,
            courseName: courses.name,
            cnt: sql<number>`COUNT(DISTINCT ${enrolledItems.studentId})`,
        })
        .from(enrolledItems)
        .innerJoin(courses, eq(enrolledItems.courseId, courses.id))
        .where(eq(enrolledItems.status, "active"))
        .groupBy(enrolledItems.courseId, courses.name)
        .orderBy(desc(sql`COUNT(DISTINCT ${enrolledItems.studentId})`))
        .limit(10);

    const studentsPerCourse = courseEnrollmentRows.map((r) => ({
        courseId: r.courseId,
        courseName: r.courseName,
        studentCount: Number(r.cnt),
    }));

    // ── 13. Students per country (Enrolled right now) ────────────────────────
    const enrolledStudents = await db
        .select({
            id: Student.id,
            phone: Student.phone,
            parentphone: Student.parentphone,
        })
        .from(Student)
        .innerJoin(enrolledItems, eq(Student.id, enrolledItems.studentId))
        .where(eq(enrolledItems.status, "active"));

    const studentsForCountry = enrolledStudents.length > 0
        ? enrolledStudents
        : await db
            .select({
                id: Student.id,
                phone: Student.phone,
                parentphone: Student.parentphone,
            })
            .from(Student);

    const countryCountMap = new Map<string, number>();
    const seenStudentIds = new Set<string>();

    for (const st of studentsForCountry) {
        if (seenStudentIds.has(st.id)) continue;
        seenStudentIds.add(st.id);
        const country = detectCountry(st.phone || st.parentphone);
        countryCountMap.set(country, (countryCountMap.get(country) ?? 0) + 1);
    }

    const studentsPerCountry = Array.from(countryCountMap.entries())
        .map(([country, studentCount]) => ({ country, studentCount }))
        .sort((a, b) => b.studentCount - a.studentCount);

    // ── 14. Top teachers by rating (selected period) ────────────────────────
    type TopTeacher = {
        rank: number;
        teacherId: string;
        teacherName: string;
        initials: string;
        sessionCount: number;
        studentCount: number;
        avgRating: number;
    };

    let topTeachers: TopTeacher[] = [];

    if (sessionIds.length > 0) {
        const topRatingRows = await db
            .select({
                teacherId: teachers.id,
                teacherName: teachers.name,
                avgRating: avg(sessionStudentRatings.overallRating),
                sessionCnt: sql<number>`COUNT(DISTINCT ${sessions.id})`,
                studentCnt: sql<number>`COUNT(DISTINCT ${sessionStudentRatings.studentId})`,
            })
            .from(sessionStudentRatings)
            .innerJoin(sessions, eq(sessionStudentRatings.sessionId, sessions.id))
            .innerJoin(teachers, eq(sessions.teacherId, teachers.id))
            .where(inArray(sessionStudentRatings.sessionId, sessionIds))
            .groupBy(teachers.id, teachers.name)
            .orderBy(desc(avg(sessionStudentRatings.overallRating)))
            .limit(5);

        topTeachers = topRatingRows.map((r, idx) => {
            const nameParts = (r.teacherName ?? "").split(" ").filter(Boolean);
            const initials = nameParts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
            return {
                rank: idx + 1,
                teacherId: r.teacherId,
                teacherName: r.teacherName ?? "",
                initials,
                sessionCount: Number(r.sessionCnt),
                studentCount: Number(r.studentCnt),
                avgRating: Math.round(Number(r.avgRating ?? 0) * 10) / 10,
            };
        });

        // Graceful fallback if no ratings yet but sessions exist
        if (topTeachers.length === 0) {
            const teacherStatsRows = await db
                .select({
                    teacherId: teachers.id,
                    teacherName: teachers.name,
                    sessionCnt: count(sessions.id),
                })
                .from(sessions)
                .innerJoin(teachers, eq(sessions.teacherId, teachers.id))
                .where(inArray(sessions.id, sessionIds))
                .groupBy(teachers.id, teachers.name)
                .orderBy(desc(count(sessions.id)))
                .limit(5);

            topTeachers = teacherStatsRows.map((r, idx) => {
                const nameParts = (r.teacherName ?? "").split(" ").filter(Boolean);
                const initials = nameParts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
                const teacherSessionIds = sessionList.filter((s) => s.teacherId === r.teacherId).map((s) => s.id);
                const studentCount = new Set(
                    presentRows.filter((a) => teacherSessionIds.includes(a.sessionId)).map((a) => a.studentId)
                ).size;

                return {
                    rank: idx + 1,
                    teacherId: r.teacherId,
                    teacherName: r.teacherName ?? "",
                    initials,
                    sessionCount: Number(r.sessionCnt),
                    studentCount,
                    avgRating: 5.0,
                };
            });
        }
    }

    // ── 15. Needs attention (7 areas) ───────────────────────────────────────
    type AttentionItem = {
        key: string;
        label: string;
        description: string;
        count: number;
        severity: "high" | "medium" | "low";
    };

    const needsAttentionItems: AttentionItem[] = [];

    // 1. Payment receipts to review (pending + receipt uploaded)
    const [pendingPayments] = await db
        .select({ cnt: count() })
        .from(payment)
        .where(and(eq(payment.status, "pending"), isNotNull(payment.receiptImg)));
    needsAttentionItems.push({
        key: "pending_receipts",
        label: "Payment receipts to review",
        description: "Check each receipt, then activate",
        count: Number(pendingPayments?.cnt ?? 0),
        severity: "high",
    });

    // 2. Free times to approve
    const [pendingPlans] = await db
        .select({ cnt: count() })
        .from(studentAvailabilityPlans)
        .where(eq(studentAvailabilityPlans.status, "pending_admin_review"));
    needsAttentionItems.push({
        key: "free_times",
        label: "Free times to approve",
        description: "Students waiting for their study plan",
        count: Number(pendingPlans?.cnt ?? 0),
        severity: "medium",
    });

    // 3. Students at 0–1 sessions left (low live balance)
    const [lowBalance] = await db
        .select({ cnt: count() })
        .from(Student)
        .where(lte(Student.livebalance, 1));
    needsAttentionItems.push({
        key: "low_sessions",
        label: "Students at 0–1 sessions left",
        description: "Renew before sessions stop",
        count: Number(lowBalance?.cnt ?? 0),
        severity: "high",
    });

    // 4. Installments overdue or at limit
    const [expiredEnrollments] = await db
        .select({ cnt: count() })
        .from(enrolledItems)
        .where(eq(enrolledItems.status, "expired"));
    needsAttentionItems.push({
        key: "overdue_installments",
        label: "Installments overdue or at limit",
        description: "Sessions blocked until paid",
        count: Number(expiredEnrollments?.cnt ?? 0),
        severity: "high",
    });

    // 5. Unmatched receipts (completed payments without student/parent link)
    const [unmatchedReceipts] = await db
        .select({ cnt: count() })
        .from(payment)
        .where(
            and(
                eq(payment.status, "completed"),
                isNull(payment.studentId),
                isNull(payment.parentId)
            )
        );
    needsAttentionItems.push({
        key: "unmatched_receipts",
        label: "Unmatched receipts",
        description: "Money without a confirmed student",
        count: Number(unmatchedReceipts?.cnt ?? 0),
        severity: "medium",
    });

    // 6. Homework to review
    const [pendingHomework] = await db
        .select({ cnt: count() })
        .from(extraHomeworkStudents)
        .where(eq(extraHomeworkStudents.status, "submitted"));
    needsAttentionItems.push({
        key: "pending_homework",
        label: "Homework to review",
        description: "Submitted homework waiting for grading",
        count: Number(pendingHomework?.cnt ?? 0),
        severity: "medium",
    });

    // 7. Unverified student accounts
    const [unverifiedStudents] = await db
        .select({ cnt: count() })
        .from(Student)
        .where(eq(Student.isVerified, false));
    needsAttentionItems.push({
        key: "unverified_students",
        label: "Unverified student accounts",
        description: "New signups pending verification",
        count: Number(unverifiedStudents?.cnt ?? 0),
        severity: "low",
    });

    const totalNeedsAttention = needsAttentionItems.reduce((acc, n) => acc + n.count, 0);
    const areasWithIssues = needsAttentionItems.filter((n) => n.count > 0).length;

    // ── 16. Return payload ──────────────────────────────────────────────────
    return SuccessResponse(res, {
        period: {
            filter: filterType,
            startDate: startStr,
            endDate: endStr,
            rangeLabel,
        },
        kpis: {
            sessions: {
                value: totalSessions,
                change: sessionsDelta.change,
                changeType: sessionsDelta.changeType,
                subLabel: vsPreviousLabel,
            },
            studentsAttended: {
                value: studentsAttended,
                change: studentsDelta.change,
                changeType: studentsDelta.changeType,
                subLabel: rangeLabel,
            },
            avgPerSession: {
                value: avgPerSession,
                change: avgDelta.change,
                changeType: avgDelta.changeType,
                subLabel: "students per session",
            },
            collected: {
                value: collected,
                currency: "LE",
                subLabel: "matched receipts in range",
            },
            teacherRating: {
                value: avgTeacherRating,
                star: true,
                teacherCount: ratingTeacherCount,
                subLabel: `${ratingTeacherCount} teachers`,
            },
        },
        chart: {
            title: "Sessions & attendance",
            subLabel: `${rangeLabel} · bars = sessions, line = students`,
            data: chartData,
        },
        sessionsPerTeacher,
        studentsPerCourse,
        studentsPerCountry,
        topTeachers,
        needsAttention: {
            totalCount: totalNeedsAttention,
            areasCount: needsAttentionItems.length,
            areasAffected: areasWithIssues,
            summaryLabel: `${totalNeedsAttention} items across ${needsAttentionItems.length} areas`,
            items: needsAttentionItems,
        },
    });
};
