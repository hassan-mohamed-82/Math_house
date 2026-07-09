import { mysqlTable, char, varchar, timestamp, int, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { courses } from "./courses";

export const rawScore = mysqlTable("raw_score", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id, { onDelete: "cascade" }),

    score: int("score").notNull(),
    is_giftingScore: boolean("is_gift").notNull().default(false),
    giftingScore: int("gifting_score").notNull().default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
