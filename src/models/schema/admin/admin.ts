import { mysqlTable, varchar, char, timestamp, mysqlEnum, json } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { roles } from "./roles";
import { Permission } from "../../../types/custom";

export const admins = mysqlTable("admins", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    nickname: varchar("nickname", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    // role: mysqlEnum("role", ["admin", "teacher"]).notNull(),

    roleId: char("role_id", { length: 36 }).references(() => roles.id),
    avatar: varchar("avatar", { length: 500 }),
    type: mysqlEnum("type", ["admin", "teacher"]).notNull().default("admin"),
    permissions: json("permissions").$type<Permission[]>().default([]),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});