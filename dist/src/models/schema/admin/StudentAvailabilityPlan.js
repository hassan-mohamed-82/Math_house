"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentPlanSessions = exports.studentAvailabilitySlots = exports.studentAvailabilityPlans = exports.adminAvailabilitySlots = exports.DAYS_OF_WEEK = void 0;
// schema/admin/StudentAvailabilityPlan.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Student_1 = require("./Student");
const Session_1 = require("./Session");
const admin_1 = require("./admin");
exports.DAYS_OF_WEEK = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];
exports.adminAvailabilitySlots = (0, mysql_core_1.mysqlTable)("admin_availability_slots", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    dayOfWeek: (0, mysql_core_1.mysqlEnum)("day_of_week", exports.DAYS_OF_WEEK).notNull(),
    timeFrom: (0, mysql_core_1.time)("time_from").notNull(),
    timeTo: (0, mysql_core_1.time)("time_to").notNull(),
    isActive: (0, mysql_core_1.boolean)("is_active").default(true).notNull(),
    createdBy: (0, mysql_core_1.char)("created_by", { length: 255 }).references(() => admin_1.admins.id, { onDelete: "set null" }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    (0, mysql_core_1.index)("admin_slots_day_idx").on(table.dayOfWeek),
    (0, mysql_core_1.index)("admin_slots_active_idx").on(table.isActive),
]);
exports.studentAvailabilityPlans = (0, mysql_core_1.mysqlTable)("student_availability_plans", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id, { onDelete: "cascade" }),
    title: (0, mysql_core_1.varchar)("title", { length: 255 }).notNull(),
    notes: (0, mysql_core_1.text)("notes"),
    status: (0, mysql_core_1.mysqlEnum)("status", [
        "pending_admin_review",
        "plan_proposed",
        "accepted",
        "rejected",
        "cancelled"
    ]).default("pending_admin_review").notNull(),
    adminNotes: (0, mysql_core_1.text)("admin_notes"),
    studentFeedback: (0, mysql_core_1.text)("student_feedback"),
    proposedBy: (0, mysql_core_1.char)("proposed_by", { length: 255 }).references(() => admin_1.admins.id, { onDelete: "set null" }),
    proposedAt: (0, mysql_core_1.timestamp)("proposed_at"),
    respondedAt: (0, mysql_core_1.timestamp)("responded_at"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
}, (table) => [
    (0, mysql_core_1.index)("student_plans_student_idx").on(table.studentId),
    (0, mysql_core_1.index)("student_plans_status_idx").on(table.status),
]);
exports.studentAvailabilitySlots = (0, mysql_core_1.mysqlTable)("student_availability_slots", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    planId: (0, mysql_core_1.char)("plan_id", { length: 36 }).notNull().references(() => exports.studentAvailabilityPlans.id, { onDelete: "cascade" }),
    adminSlotId: (0, mysql_core_1.char)("admin_slot_id", { length: 36 }).references(() => exports.adminAvailabilitySlots.id, { onDelete: "set null" }),
    dayOfWeek: (0, mysql_core_1.mysqlEnum)("day_of_week", exports.DAYS_OF_WEEK),
    specificDate: (0, mysql_core_1.date)("specific_date"),
    timeFrom: (0, mysql_core_1.time)("time_from").notNull(),
    timeTo: (0, mysql_core_1.time)("time_to").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, mysql_core_1.index)("availability_slots_plan_idx").on(table.planId),
    (0, mysql_core_1.index)("availability_slots_admin_slot_idx").on(table.adminSlotId),
]);
exports.studentPlanSessions = (0, mysql_core_1.mysqlTable)("student_plan_sessions", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    planId: (0, mysql_core_1.char)("plan_id", { length: 36 }).notNull().references(() => exports.studentAvailabilityPlans.id, { onDelete: "cascade" }),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => Session_1.sessions.id, { onDelete: "cascade" }),
    notes: (0, mysql_core_1.varchar)("notes", { length: 255 }),
    orderIndex: (0, mysql_core_1.int)("order_index").default(0),
    // Per-session student response: pending (default) → accepted or rejected when student responds
    studentResponse: (0, mysql_core_1.mysqlEnum)("student_response", ["pending", "accepted", "rejected"]).default("pending").notNull(),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, mysql_core_1.uniqueIndex)("plan_session_unique").on(table.planId, table.sessionId),
    (0, mysql_core_1.index)("plan_sessions_plan_idx").on(table.planId),
    (0, mysql_core_1.index)("plan_sessions_session_idx").on(table.sessionId),
    (0, mysql_core_1.index)("plan_sessions_response_idx").on(table.studentResponse),
]);
