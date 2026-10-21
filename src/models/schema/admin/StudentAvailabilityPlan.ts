// schema/admin/StudentAvailabilityPlan.ts
import { mysqlTable, varchar, char, timestamp, text, mysqlEnum, date, time, int, uniqueIndex, index, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { Student } from "./Student";
import { sessions } from "./Session";
import { admins } from "./admin";

export const DAYS_OF_WEEK = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
] as const;

export const adminAvailabilitySlots = mysqlTable("admin_availability_slots", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    dayOfWeek: mysqlEnum("day_of_week", DAYS_OF_WEEK).notNull(),
    timeFrom: time("time_from").notNull(),
    timeTo: time("time_to").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdBy: char("created_by", { length: 255 }).references(() => admins.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    index("admin_slots_day_idx").on(table.dayOfWeek),
    index("admin_slots_active_idx").on(table.isActive),
]);

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
    adminSlotId: char("admin_slot_id", { length: 36 }).references(() => adminAvailabilitySlots.id, { onDelete: "set null" }),

    dayOfWeek: mysqlEnum("day_of_week", DAYS_OF_WEEK),
    specificDate: date("specific_date"),

    timeFrom: time("time_from").notNull(),
    timeTo: time("time_to").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("availability_slots_plan_idx").on(table.planId),
    index("availability_slots_admin_slot_idx").on(table.adminSlotId),
]);

export const studentPlanSessions = mysqlTable("student_plan_sessions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    planId: char("plan_id", { length: 36 }).notNull().references(() => studentAvailabilityPlans.id, { onDelete: "cascade" }),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id, { onDelete: "cascade" }),
    notes: varchar("notes", { length: 255 }),
    orderIndex: int("order_index").default(0),

    // Per-session student response: pending (default) → accepted or rejected when student responds
    studentResponse: mysqlEnum("student_response", ["pending", "accepted", "rejected"]).default("pending").notNull(),

    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    uniqueIndex("plan_session_unique").on(table.planId, table.sessionId),
    index("plan_sessions_plan_idx").on(table.planId),
    index("plan_sessions_session_idx").on(table.sessionId),
    index("plan_sessions_response_idx").on(table.studentResponse),
]);
