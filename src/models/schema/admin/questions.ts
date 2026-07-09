import { mysqlTable, varchar, char, timestamp, double, int, mysqlEnum, boolean, year, text } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { lessons } from "./lessons";
import { examCodes } from "./examCodes";
import { Sections } from "./sections";

export const questions = mysqlTable("questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    question: varchar("question", { length: 255 }).notNull(),
    image: varchar("image", { length: 255 }),
    answerType: mysqlEnum("answerType", ["MCQ", "Grid in"]).notNull(),
    difficulty: mysqlEnum("difficulty", ["A", "B", "C", "D", "E"]).notNull(),
    questionType: mysqlEnum("questionType", ["Trail", "Extra", "Parallel"]).notNull(),

    // Linking
    lessonId: char("lesson_id", { length: 255 }).notNull().references(() => lessons.id, { onDelete: "cascade" }),

    // Meta
    year: year("year"),
    month: mysqlEnum("month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]),
    sectionId: char("section_id", { length: 255 }).references(() => Sections.id, { onDelete: "cascade" }),
    codeId: char("code_id", { length: 255 }).references(() => examCodes.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const questionOptions = mysqlTable("question_options", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id, { onDelete: "cascade" }),
    answer: varchar("answer", { length: 255 }).notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    order: char("order", { length: 1 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const questionAnswers = mysqlTable("question_answers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id, { onDelete: "cascade" }),
    pdf: varchar("answer_pdf", { length: 255 }),
    video: varchar("answer_video", { length: 255 }),
    image: varchar("answer_image", { length: 255 }),
    text: text("answer_text"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const ParallelQuestion = mysqlTable("parallel_questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    origianlQuestionId: char("question_id", { length: 255 }).notNull().references(() => questions.id, { onDelete: "cascade" }),
    question: varchar("question", { length: 255 }).notNull(),
    answerType: mysqlEnum("answerType", ["MCQ", "Grid in"]).notNull(),
    difficulty: mysqlEnum("difficulty", ["A", "B", "C", "D", "E"]).notNull(),
    lessonId: char("lesson_id", { length: 255 }).notNull().references(() => lessons.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const ParallelQuestionOptions = mysqlTable("parallel_question_options", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    questionId: char("question_id", { length: 255 }).notNull().references(() => ParallelQuestion.id, { onDelete: "cascade" }),
    answer: varchar("answer", { length: 255 }).notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    order: char("order", { length: 1 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});