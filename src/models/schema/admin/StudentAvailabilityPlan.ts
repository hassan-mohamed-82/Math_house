// schema/admin/StudentAvailabilityPlan.ts
import { mysqlTable, varchar, char, timestamp, text, mysqlEnum, date, time, int, uniqueIndex, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { sessions } from "./Session";
import { admins } from "./admin";

export const studentAvailabilityPlans = mysqlTable("student_availability_plans", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    studentId: char("student_id", { length: 36 }).notNull().references(() => Student.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    notes: text("notes"),

    status: mysqlEnum("status", [
        "pending_admin_review",
        "plan_proposed",
        "accepted",
        "rejected",
        "cancelled"
    ]).default("pending_admin_review").notNull(),

    adminNotes: text("admin_notes"),
    studentFeedback: text("student_feedback"),

    proposedBy: char("proposed_by", { length: 255 }).references(() => admins.id, { onDelete: "set null" }),
    proposedAt: timestamp("proposed_at"),
    respondedAt: timestamp("responded_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    index("student_plans_student_idx").on(table.studentId),
    index("student_plans_status_idx").on(table.status),
]);

export const studentAvailabilitySlots = mysqlTable("student_availability_slots", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    planId: char("plan_id", { length: 36 }).notNull().references(() => studentAvailabilityPlans.id, { onDelete: "cascade" }),

    dayOfWeek: mysqlEnum("day_of_week", [
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday"
    ]),
    specificDate: date("specific_date"),

    timeFrom: time("time_from").notNull(),
    timeTo: time("time_to").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("availability_slots_plan_idx").on(table.planId),
]);

export const studentPlanSessions = mysqlTable("student_plan_sessions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    planId: char("plan_id", { length: 36 }).notNull().references(() => studentAvailabilityPlans.id, { onDelete: "cascade" }),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    notes: varchar("notes", { length: 255 }),
    orderIndex: int("order_index").default(0),

    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    uniqueIndex("plan_session_unique").on(table.planId, table.sessionId),
    index("plan_sessions_plan_idx").on(table.planId),
    index("plan_sessions_session_idx").on(table.sessionId),
]);
