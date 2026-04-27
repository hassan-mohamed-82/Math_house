import { mysqlTable, varchar, char, mysqlEnum, boolean, int } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { category } from "./category";
import { grade } from "./grade";
export const Student = mysqlTable("student", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    firstname:varchar("first_name", { length: 255 }).notNull(),
    lastname:varchar("last_name",{length:255}).notNull(),
    nickname:varchar("nickname",{length:255}).notNull(),
    email:varchar("email",{length:255}).notNull().unique(),
    password:varchar("password",{length:255}).notNull(),
    phone:varchar("phone",{length:255}).notNull(),
    category:char("category",{length:36}).notNull().references(()=>category.id),
    grade:char("grade",{length:36}).notNull().references(()=>grade.id),
    parentphone:varchar("parent_phone",{length:255}),
    isVerified:boolean("is_verified").notNull().default(false),

    livebalance: int("live_balance").notNull().default(0),
    exambalance: int("exam_balance").notNull().default(0),
    questionbalance: int("question_balance").notNull().default(0),
    
    avatar:varchar("avatar",{length:255}),
})
