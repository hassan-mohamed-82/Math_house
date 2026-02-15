"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelQuestionOptions = exports.ParallelQuestion = exports.questionAnswers = exports.questionOptions = exports.questions = void 0;
const mysql_core_1 = require("drizzle-orm/mysql-core");
const drizzle_orm_1 = require("drizzle-orm");
const lessons_1 = require("./lessons");
const examCodes_1 = require("./examCodes");
exports.questions = (0, mysql_core_1.mysqlTable)("questions", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    question: (0, mysql_core_1.varchar)("question", { length: 255 }).notNull(),
    image: (0, mysql_core_1.varchar)("image", { length: 255 }),
    answerType: (0, mysql_core_1.mysqlEnum)("answerType", ["MCQ", "Grid in"]).notNull(),
    difficulty: (0, mysql_core_1.mysqlEnum)("difficulty", ["A", "B", "C", "D", "E"]).notNull(),
    questionType: (0, mysql_core_1.mysqlEnum)("questionType", ["Trail", "Extra"]).notNull(),
    // Linking
    lessonId: (0, mysql_core_1.char)("lesson_id", { length: 255 }).notNull().references(() => lessons_1.lessons.id),
    // Meta
    year: (0, mysql_core_1.year)("year").notNull(),
    month: (0, mysql_core_1.mysqlEnum)("month", ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]).notNull(),
    section: (0, mysql_core_1.mysqlEnum)("section", ["1", "2", "3", "4"]).notNull(),
    codeId: (0, mysql_core_1.char)("code_id", { length: 255 }).notNull().references(() => examCodes_1.examCodes.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.questionOptions = (0, mysql_core_1.mysqlTable)("question_options", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => exports.questions.id),
    answer: (0, mysql_core_1.varchar)("answer", { length: 255 }).notNull(),
    isCorrect: (0, mysql_core_1.boolean)("is_correct").notNull().default(false),
    order: (0, mysql_core_1.char)("order", { length: 1 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.questionAnswers = (0, mysql_core_1.mysqlTable)("question_answers", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => exports.questions.id),
    pdf: (0, mysql_core_1.varchar)("answer_pdf", { length: 255 }),
    video: (0, mysql_core_1.varchar)("answer_video", { length: 255 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.ParallelQuestion = (0, mysql_core_1.mysqlTable)("parallel_questions", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    origianlQuestionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => exports.questions.id),
    question: (0, mysql_core_1.varchar)("question", { length: 255 }).notNull(),
    answerType: (0, mysql_core_1.mysqlEnum)("answerType", ["MCQ", "Grid in"]).notNull(),
    difficulty: (0, mysql_core_1.mysqlEnum)("difficulty", ["A", "B", "C", "D", "E"]).notNull(),
    lessonId: (0, mysql_core_1.char)("lesson_id", { length: 255 }).notNull().references(() => lessons_1.lessons.id),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
});
exports.ParallelQuestionOptions = (0, mysql_core_1.mysqlTable)("parallel_question_options", {
    id: (0, mysql_core_1.char)("id", { length: 255 }).primaryKey().notNull().default((0, drizzle_orm_1.sql) `(uuid())`),
    questionId: (0, mysql_core_1.char)("question_id", { length: 255 }).notNull().references(() => exports.ParallelQuestion.id),
    answer: (0, mysql_core_1.varchar)("answer", { length: 255 }).notNull(),
    isCorrect: (0, mysql_core_1.boolean)("is_correct").notNull().default(false),
    order: (0, mysql_core_1.char)("order", { length: 1 }),
    createdAt: (0, mysql_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, mysql_core_1.timestamp)("updated_at").defaultNow().onUpdateNow(),
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
