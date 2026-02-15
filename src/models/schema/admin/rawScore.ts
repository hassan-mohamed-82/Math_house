import { mysqlTable, char, varchar, timestamp, int, boolean } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { courses } from "./courses";

export const rawScore = mysqlTable("raw_score", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    name: varchar("name", { length: 255 }).notNull(),
    courseId: char("course_id", { length: 255 }).notNull().references(() => courses.id),

    score: int("score").notNull(),
    is_giftingScore: boolean("is_gift").notNull().default(false),
    giftingScore: int("gifting_score").notNull().default(0),

    numberOfQuestions: int("number_of_questions").notNull(),

    TotalScoreCalc: int("total_score").generatedAlwaysAs(sql`CASE WHEN is_gift = 1 THEN score - gifting_score ELSE score END`),

    GradePerQuestion: int("grade_per_question").generatedAlwaysAs(sql`CASE WHEN number_of_questions = 0 THEN 0 ELSE total_score / number_of_questions END`),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
