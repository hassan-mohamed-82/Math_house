import { mysqlTable, varchar, char, timestamp, mysqlEnum, date, time } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { teachers } from "./teacher";
import { category } from "./category";
import { courses } from "./courses";
import { groups } from "./Groups";
// إذا كان لديك جدول للفصول (chapters) قم باستيراده هنا، سأعتبر أنه موجود أو سنحفظه كـ نص مؤقتاً

export const sessions = mysqlTable("sessions", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    name: varchar("name", { length: 255 }).notNull(),
    sessionDate: date("session_date").notNull(),
    timeFrom: time("time_from").notNull(),
    timeTo: time("time_to").notNull(),
    categoryId: char("category_id", { length: 36 }).notNull().references(() => category.id),
    courseId: char("course_id", { length: 36 }).notNull().references(() => courses.id),
    
    // 👇 الحقل الجديد: الفصل (Chapter)
    chapterId: char("chapter_id", { length: 36 }), 
    
    lessonId: char("lesson_id", { length: 36 }),
    lessonName: varchar("lesson_name", { length: 500 }),
    
    type: mysqlEnum("type", ["session", "private", "group"]).notNull(),
    
    // 👇 الحقل الجديد: نوع الجلسة المرتبط
    sessionRelationalType: mysqlEnum("session_relational_type", ["explanation", "re_explanation", "mistakes","Exam"]).notNull(),
    
    groupId: char("group_id", { length: 36 }).references(() => groups.id),
    teacherId: char("teacher_id", { length: 255 }).notNull().references(() => teachers.id),
    
    session_link: varchar("session_link", { length: 500 }).notNull(),
    material_link: varchar("material_link", { length: 500 }),
    teacher_material_link: varchar("teacher_material_link", { length: 500 }),
    
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessionUsers = mysqlTable("session_users", {
    id: char("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
    sessionId: char("session_id", { length: 36 }).notNull().references(() => sessions.id),
    studentId: char("student_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});