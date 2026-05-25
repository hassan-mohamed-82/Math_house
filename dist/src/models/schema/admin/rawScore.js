"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rawScore = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const courses_1 = require("./courses");
exports.rawScore = (0, mysql_core_1.mysqlTable)("raw_score", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    courseId: (0, mysql_core_1.char)("course_id", { length: 255 }).notNull().references(() => courses_1.courses.id),
    score: (0, mysql_core_1.int)("score").notNull(),
    is_giftingScore: (0, mysql_core_1.boolean)("is_gift").notNull().default(false),
    giftingScore: (0, mysql_core_1.int)("gifting_score").notNull().default(0),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
