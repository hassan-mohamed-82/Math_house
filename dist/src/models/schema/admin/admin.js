"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.admins = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const roles_1 = require("./roles");
exports.admins = (0, mysql_core_1.mysqlTable)("admins", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    nickname: (0, mysql_core_1.varchar)("nickname", { length: 255 }).notNull(),
    name: (0, mysql_core_1.varchar)("name", { length: 255 }).notNull(),
    email: (0, mysql_core_1.varchar)("email", { length: 255 }).notNull(),
    phoneNumber: (0, mysql_core_1.varchar)("phone_number", { length: 255 }).notNull(),
    password: (0, mysql_core_1.varchar)("password", { length: 255 }).notNull(),
    // role: mysqlEnum("role", ["admin", "teacher"]).notNull(),
    roleId: (0, mysql_core_1.char)("role_id", { length: 36 }).references(() => roles_1.roles.id),
    avatar: (0, mysql_core_1.varchar)("avatar", { length: 500 }),
    type: (0, mysql_core_1.mysqlEnum)("type", ["admin", "teacher"]).notNull().default("admin"),
    permissions: (0, mysql_core_1.json)("permissions").$type().default([]),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow(),
});
