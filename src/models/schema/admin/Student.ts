import { mysqlTable, varchar, char, timestamp, mysqlEnum, double } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { category } from "./category";
export const Student = mysqlTable("student", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    firstname:varchar("first_name", { length: 255 }).notNull(),
    lastname:varchar("last_name",{length:255}).notNull(),
    nickname:varchar("nickname",{length:255}).notNull(),
    email:varchar("email",{length:255}).notNull(),
    password:varchar("password",{length:255}).notNull(),
    phone:varchar("phone",{length:255}).notNull(),
    category:char("category",{length:36}).notNull().references(()=>category.id),
    grade:mysqlEnum("grade",["1","2","3","4","5","6","7","8","9","10","11","12","13"]).notNull(),
    parentphone:varchar("parent_phone",{length:255}).notNull(),
    
    

})
