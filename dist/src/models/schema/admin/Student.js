"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Student = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const category_1 = require("./category");
const grade_1 = require("./grade");
const uuid_1 = require("uuid");
exports.Student = (0, mysql_core_1.mysqlTable)("student", {
    id: (0, mysql_core_1.char)("id", { length: 36 }).primaryKey().$defaultFn(() => (0, uuid_1.v4)()),
    firstname: (0, mysql_core_1.varchar)("first_name", { length: 255 }).notNull(),
    lastname: (0, mysql_core_1.varchar)("last_name", { length: 255 }).notNull(),
    nickname: (0, mysql_core_1.varchar)("nickname", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    phone: (0, mysql_core_1.varchar)("phone", { length: 255 }).notNull(),
    category: (0, mysql_core_1.char)("category", { length: 36 }).notNull().references(() => category_1.category.id),
    grade: (0, mysql_core_1.char)("grade", { length: 36 }).notNull().references(() => grade_1.grade.id),
    parentphone: (0, mysql_core_1.varchar)("parent_phone", { length: 255 }),
    isVerified: (0, mysql_core_1.boolean)("is_verified").notNull().default(false),
    livebalance: (0, mysql_core_1.int)("live_balance").notNull().default(0),
    exambalance: (0, mysql_core_1.int)("exam_balance").notNull().default(0),
    questionbalance: (0, mysql_core_1.int)("question_balance").notNull().default(0),
    avatar: (0, mysql_core_1.varchar)("avatar", { length: 255 }),
});
