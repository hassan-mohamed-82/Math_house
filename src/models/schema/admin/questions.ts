import { mysqlTable, varchar, char, timestamp, double, int, mysqlEnum, boolean, year } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { lessons } from "./lessons";
import { examCodes } from "./examCodes";

export const questions = mysqlTable("questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    question: varchar("question", { length: 255 }).notNull(),
    image: varchar("image", { length: 255 }),
    answerType: mysqlEnum("answerType", ["MCQ", "Grid in"]).notNull(),
    difficulty: mysqlEnum("difficulty", ["A", "B", "C", "D", "E"]).notNull(),
    questionType: mysqlEnum("questionType", ["Trail", "Extra"]).notNull(),

    // Linking
    lessonId: char("lesson_id", { length: 255 }).notNull().references(() => lessons.id),

    // Meta
    year: year("year").notNull(),
    month: mysqlEnum("month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]).notNull(),
    section: mysqlEnum("section", ["1", "2", "3", "4"]).notNull(),
    codeId: char("code_id", { length: 255 }).notNull().references(() => examCodes.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const questionOptions = mysqlTable("question_options", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id),
    answer: varchar("answer", { length: 255 }).notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    order: char("order", { length: 1 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const questionAnswers = mysqlTable("question_answers", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    questionId: char("question_id", { length: 255 }).notNull().references(() => questions.id),
    pdf: varchar("answer_pdf", { length: 255 }),
    video: varchar("answer_video", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const ParallelQuestion = mysqlTable("parallel_questions", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    origianlQuestionId: char("question_id", { length: 255 }).notNull().references(() => questions.id),
    question: varchar("question", { length: 255 }).notNull(),
    answerType: mysqlEnum("answerType", ["MCQ", "Grid in"]).notNull(),
    difficulty: mysqlEnum("difficulty", ["A", "B", "C", "D", "E"]).notNull(),
    lessonId: char("lesson_id", { length: 255 }).notNull().references(() => lessons.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const ParallelQuestionOptions = mysqlTable("parallel_question_options", {
    id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
    questionId: char("question_id", { length: 255 }).notNull().references(() => ParallelQuestion.id),
    answer: varchar("answer", { length: 255 }).notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    order: char("order", { length: 1 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// TODO in the Future
// export const ParallelQuestionAnswers = mysqlTable("parallel_question_answers", {
//     id: char("id", { length: 255 }).primaryKey().notNull().default(sql`(uuid())`),
//     questionId: char("question_id", { length: 255 }).notNull().references(() => ParallelQuestion.id),
//     pdf: varchar("answer_pdf", { length: 255 }),
//     video: varchar("answer_video", { length: 255 }),
//     createdAt: timestamp("created_at").defaultNow(),
//     updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
// });
