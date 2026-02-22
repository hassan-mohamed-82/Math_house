"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRatings = void 0;
// models/schema/admin/sessionRatings.ts
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const Session_1 = require("./Session");
const Student_1 = require("./Student");
exports.sessionRatings = (0, mysql_core_1.mysqlTable)("session_ratings", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().default((0, drizzle_orm_1.sql) `(UUID())`),
    sessionId: (0, mysql_core_1.char)("session_id", { length: 36 }).notNull().references(() => Session_1.sessions.id),
    studentId: (0, mysql_core_1.char)("student_id", { length: 36 }).notNull().references(() => Student_1.Student.id),
    rating: (0, mysql_core_1.int)("rating").notNull(), // 1-10
    comment: (0, mysql_core_1.text)("comment"),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
